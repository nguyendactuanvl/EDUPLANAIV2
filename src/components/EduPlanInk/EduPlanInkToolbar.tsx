import React, { useState } from 'react';
import { 
  PenTool, Highlighter, Sparkles, Eraser, Shapes, Ruler, Type, 
  Hand, Undo2, Redo2, Trash2, Download, FileText, Layers, 
  ChevronLeft, ChevronRight, Palette, Sliders, ShieldCheck, 
  Maximize2, Plus, Check, ChevronDown, Rotate3d, FolderOpen
} from 'lucide-react';
import { InkTool, ShapeType, BackgroundType } from './types';

interface EduPlanInkToolbarProps {
  activeTool: InkTool;
  onSelectTool: (tool: InkTool) => void;
  currentColor: string;
  onChangeColor: (color: string) => void;
  strokeSize: number;
  onChangeSize: (size: number) => void;
  lineStyle?: 'solid' | 'dashed';
  onChangeLineStyle?: (style: 'solid' | 'dashed') => void;
  shapeType: ShapeType;
  onChangeShapeType: (shape: ShapeType) => void;
  
  // States
  penOnlyTouch: boolean;
  onTogglePenOnlyTouch: () => void;
  
  // Page info
  currentPageIndex: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddPage: () => void;
  onToggleDrawer: () => void;
  
  // History
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: () => void;
  
  // Background
  currentBackground: BackgroundType;
  onChangeBackground: (bg: BackgroundType) => void;

  // Export
  onExportPNG: () => void;
  onExportPDF: () => void;

  // 3D Library
  onOpen3DLibrary?: () => void;

  // Image/PDF file upload background
  onUploadBackground: (file: File) => void;
}

export const EduPlanInkToolbar: React.FC<EduPlanInkToolbarProps> = ({
  activeTool,
  onSelectTool,
  currentColor,
  onChangeColor,
  strokeSize,
  onChangeSize,
  lineStyle = 'solid',
  onChangeLineStyle,
  shapeType,
  onChangeShapeType,
  penOnlyTouch,
  onTogglePenOnlyTouch,
  currentPageIndex,
  totalPages,
  onPrevPage,
  onNextPage,
  onAddPage,
  onToggleDrawer,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearPage,
  currentBackground,
  onChangeBackground,
  onExportPNG,
  onExportPDF,
  onOpen3DLibrary,
  onUploadBackground
}) => {
  const [showPenMenu, setShowPenMenu] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showEraserMenu, setShowEraserMenu] = useState(false);
  const [showBgMenu, setShowBgMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [shapeCategory, setShapeCategory] = useState<'2d' | '3d' | 'graph'>('2d');

  const shapes2D = [
    { type: 'auto', label: 'Tự động ✨' },
    { type: 'line', label: 'Đoạn thẳng' },
    { type: 'arrow', label: 'Mũi tên' },
    { type: 'rect', label: 'Chữ nhật' },
    { type: 'triangle', label: 'Tam giác' },
    { type: 'circle', label: 'Đường tròn' },
    { type: 'coordinate_axes', label: 'Trục Oxy' },
  ];

  const shapes3D = [
    { type: 'tetrahedron', label: 'Tứ diện S.ABC' },
    { type: 'pyramid_square', label: 'Chóp tứ giác S.ABCD' },
    { type: 'frustum', label: 'Hình chóp cụt 3D' },
    { type: 'cuboid', label: 'Hình hộp 3D' },
    { type: 'prism_triangular', label: 'Lăng trụ tam giác' },
    { type: 'cone', label: 'Hình nón' },
    { type: 'cylinder', label: 'Hình trụ' },
    { type: 'sphere', label: 'Hình cầu' },
    { type: 'coordinate_axes_3d', label: 'Hệ trục Oxyz 3D' },
  ];

  const shapesGraph = [
    { type: 'graph_linear', label: 'Bậc 1 y=ax+b' },
    { type: 'graph_parabola', label: 'Parabol y=ax²' },
    { type: 'graph_cubic', label: 'Bậc 3 uốn' },
    { type: 'graph_hyperbola', label: 'Nhất biến (Tiệm cận)' },
    { type: 'graph_sin', label: 'Lượng giác y=sin x' },
  ];

  // Classroom Pen Color Palettes
  const penColors = [
    { color: '#ffffff', label: 'Trắng (Phấn)' },
    { color: '#facc15', label: 'Vàng phấn' },
    { color: '#38bdf8', label: 'Xanh lam' },
    { color: '#4ade80', label: 'Xanh lá' },
    { color: '#f43f5e', label: 'Đỏ thắm' },
    { color: '#0f172a', label: 'Đen' },
    { color: '#2563eb', label: 'Xanh dương' },
    { color: '#16a34a', label: 'Xanh lá sẫm' },
  ];

  const highlighterColors = [
    { color: 'rgba(253, 224, 71, 0.4)', hex: '#fde047', label: 'Vàng dạ quang' },
    { color: 'rgba(56, 189, 248, 0.4)', hex: '#38bdf8', label: 'Xanh dạ quang' },
    { color: 'rgba(244, 63, 94, 0.4)', hex: '#f43f5e', label: 'Hồng dạ quang' },
    { color: 'rgba(74, 222, 128, 0.4)', hex: '#4ade80', label: 'Xanh lá dạ quang' },
  ];

  const backgroundPresets: { type: BackgroundType; label: string; icon: string }[] = [
    { type: 'green_board', label: 'Bảng xanh học đường', icon: '🎨' },
    { type: 'blackboard', label: 'Bảng đen truyền thống', icon: '⬛' },
    { type: 'whiteboard', label: 'Bảng trắng văn phòng', icon: '⬜' },
    { type: 'grid_paper', label: 'Giấy ô ly học sinh', icon: '📝' },
    { type: 'lines_paper', label: 'Giấy kẻ ngang', icon: '📄' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadBackground(file);
    }
    e.target.value = '';
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-auto">
      {/* Secondary Floating Sub-Bar for active tool settings if needed */}
      {(showPenMenu || showShapeMenu || showEraserMenu || showBgMenu || showExportMenu) && (
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-white flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3 max-w-2xl overflow-x-auto custom-scrollbar">
          {/* Pen options popover */}
          {showPenMenu && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 border-r border-slate-700 pr-3">
                <span className="text-xs font-semibold text-slate-400">Màu mực:</span>
                <div className="flex items-center gap-1">
                  {(activeTool === 'highlighter' ? highlighterColors.map(c => ({ color: c.color, hex: c.hex, label: c.label })) : penColors.map(c => ({ color: c.color, hex: c.color, label: c.label }))).map((c) => (
                    <button
                      key={c.color}
                      onClick={() => onChangeColor(c.color)}
                      className={`w-6 h-6 rounded-full border border-white/20 transition-transform ${
                        currentColor === c.color ? 'scale-125 ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={currentColor.startsWith('#') ? currentColor : '#2563eb'}
                    onChange={(e) => onChangeColor(e.target.value)}
                    className="w-6 h-6 rounded border-0 p-0 cursor-pointer bg-transparent"
                    title="Màu tùy chỉnh"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 border-r border-slate-700 pr-3">
                <span className="text-xs font-semibold text-slate-400">Nét ({strokeSize}px):</span>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={strokeSize}
                  onChange={(e) => onChangeSize(Number(e.target.value))}
                  className="w-20 accent-emerald-500 cursor-pointer"
                />
              </div>

              {onChangeLineStyle && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-400">Kiểu nét:</span>
                  <button
                    onClick={() => onChangeLineStyle('solid')}
                    className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                      lineStyle === 'solid' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Nét liền"
                  >
                    — Nét liền
                  </button>
                  <button
                    onClick={() => onChangeLineStyle('dashed')}
                    className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                      lineStyle === 'dashed' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Nét đứt (đoạn thẳng đứt)"
                  >
                    - - Nét đứt
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Shape options popover */}
          {showShapeMenu && (
            <div className="flex flex-col gap-2 max-w-xl">
              <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Loại hình:</span>
                  <button
                    onClick={() => setShapeCategory('2d')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      shapeCategory === '2d' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    📐 Hình phẳng (2D)
                  </button>
                  <button
                    onClick={() => setShapeCategory('3d')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      shapeCategory === '3d' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    📦 Hình không gian (3D)
                  </button>
                  <button
                    onClick={() => setShapeCategory('graph')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      shapeCategory === 'graph' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    📈 Đồ thị hàm số (Cấp 2 & 3)
                  </button>
                </div>

                {onChangeLineStyle && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-400">Nét:</span>
                    <button
                      onClick={() => onChangeLineStyle('solid')}
                      className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                        lineStyle === 'solid' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      — Liền
                    </button>
                    <button
                      onClick={() => onChangeLineStyle('dashed')}
                      className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                        lineStyle === 'dashed' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      - - Đứt
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(shapeCategory === '2d' ? shapes2D : shapeCategory === '3d' ? shapes3D : shapesGraph).map((s) => (
                  <button
                    key={s.type}
                    onClick={() => onChangeShapeType(s.type as ShapeType)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      shapeType === s.type
                        ? 'bg-emerald-500 text-white font-bold ring-2 ring-emerald-400/50 scale-105'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Background options popover */}
          {showBgMenu && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Đổi nền:</span>
              {backgroundPresets.map((bg) => (
                <button
                  key={bg.type}
                  onClick={() => onChangeBackground(bg.type)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition-colors ${
                    currentBackground === bg.type
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{bg.icon}</span>
                  <span>{bg.label}</span>
                </button>
              ))}
              <label className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium cursor-pointer flex items-center gap-1 border border-slate-600">
                <span>📁</span>
                <span>Tải ảnh/PDF bài giảng</span>
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}

          {/* Export options popover */}
          {showExportMenu && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400">Xuất dữ liệu:</span>
              <button
                onClick={() => {
                  onExportPNG();
                  setShowExportMenu(false);
                }}
                className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Lưu ảnh HD PNG</span>
              </button>
              <button
                onClick={() => {
                  onExportPDF();
                  setShowExportMenu(false);
                }}
                className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Xuất PDF bài giảng ({totalPages} trang)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Floating Rounded Toolbar */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-2 shadow-2xl text-white flex items-center gap-1.5 sm:gap-2">
        {/* Pen Tool */}
        <button
          onClick={() => {
            onSelectTool('pen');
            setShowPenMenu(!showPenMenu);
            setShowShapeMenu(false);
            setShowBgMenu(false);
            setShowExportMenu(false);
          }}
          className={`p-2 sm:p-2.5 rounded-xl font-medium flex items-center gap-1 transition-all ${
            activeTool === 'pen'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-105'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Bút mực (Ballpoint Pen)"
        >
          <PenTool className="w-5 h-5" />
          <div
            className="w-2.5 h-2.5 rounded-full border border-white/40 hidden sm:block"
            style={{ backgroundColor: currentColor }}
          />
        </button>

        {/* Highlighter Tool */}
        <button
          onClick={() => {
            onSelectTool('highlighter');
            setShowPenMenu(!showPenMenu);
            setShowShapeMenu(false);
            setShowBgMenu(false);
            setShowExportMenu(false);
          }}
          className={`p-2 sm:p-2.5 rounded-xl font-medium flex items-center gap-1 transition-all ${
            activeTool === 'highlighter'
              ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/25 scale-105'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Bút dạ quang (Highlighter)"
        >
          <Highlighter className="w-5 h-5" />
        </button>

        {/* Laser Pointer */}
        <button
          onClick={() => {
            onSelectTool('laser');
            setShowPenMenu(false);
            setShowShapeMenu(false);
            setShowBgMenu(false);
            setShowExportMenu(false);
          }}
          className={`p-2 sm:p-2.5 rounded-xl font-medium flex items-center gap-1 transition-all ${
            activeTool === 'laser'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 scale-105'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Bút Laser trình chiếu (Tự biến mất)"
        >
          <Sparkles className="w-5 h-5 text-rose-400" />
        </button>

        {/* Smart Shape Tool */}
        <button
          onClick={() => {
            onSelectTool('shape');
            setShowShapeMenu(!showShapeMenu);
            setShowPenMenu(false);
            setShowBgMenu(false);
            setShowExportMenu(false);
          }}
          className={`p-2 sm:p-2.5 rounded-xl font-medium flex items-center gap-1 transition-all ${
            activeTool === 'shape'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-105'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Vẽ hình thông minh & Thước nắn thẳng"
        >
          <Shapes className="w-5 h-5" />
        </button>

        {/* 3D Shape Interactive Library */}
        {onOpen3DLibrary && (
          <button
            onClick={() => {
              onOpen3DLibrary();
              setShowPenMenu(false);
              setShowShapeMenu(false);
              setShowBgMenu(false);
              setShowExportMenu(false);
            }}
            className="p-2 sm:p-2.5 rounded-xl font-medium flex items-center gap-1 text-sky-300 bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 hover:text-white transition-all scale-100 hover:scale-105 shadow-md"
            title="Thư viện Khối Hình 3D Xoay Cảm Ứng (Cube, Pyramid, Prism, Sphere, Cone)"
          >
            <Rotate3d className="w-5 h-5 animate-pulse" />
          </button>
        )}

        {/* Virtual Ruler Tool */}
        <button
          onClick={() => {
            onSelectTool('ruler');
            setShowPenMenu(false);
            setShowShapeMenu(false);
            setShowBgMenu(false);
            setShowExportMenu(false);
          }}
          className={`p-2 sm:p-2.5 rounded-xl font-medium flex items-center gap-1 transition-all ${
            activeTool === 'ruler'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-105'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Thước kẻ ảo"
        >
          <Ruler className="w-5 h-5" />
        </button>

        {/* Eraser Stroke Tool */}
        <button
          onClick={() => {
            onSelectTool('eraser_stroke');
            setShowPenMenu(false);
            setShowShapeMenu(false);
            setShowBgMenu(false);
            setShowExportMenu(false);
          }}
          className={`p-2 sm:p-2.5 rounded-xl font-medium flex items-center gap-1 transition-all ${
            activeTool === 'eraser_stroke' || activeTool === 'eraser_pixel'
              ? 'bg-slate-700 text-white ring-2 ring-emerald-400 scale-105'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Tẩy thông minh (Stroke / Pixel)"
        >
          <Eraser className="w-5 h-5" />
        </button>

        {/* Text / Formula Note Tool */}
        <button
          onClick={() => {
            onSelectTool('text');
            setShowPenMenu(false);
            setShowShapeMenu(false);
            setShowBgMenu(false);
            setShowExportMenu(false);
          }}
          className={`p-2 sm:p-2.5 rounded-xl font-medium transition-all ${
            activeTool === 'text'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25 scale-105'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Chèn văn bản / Công thức toán"
        >
          <Type className="w-5 h-5" />
        </button>

        {/* Hand / Pan Tool */}
        <button
          onClick={() => {
            onSelectTool('pan');
            setShowPenMenu(false);
            setShowShapeMenu(false);
            setShowBgMenu(false);
            setShowExportMenu(false);
          }}
          className={`p-2 sm:p-2.5 rounded-xl font-medium transition-all ${
            activeTool === 'pan'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-105'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Di chuyển & Phóng to / Thu nhỏ"
        >
          <Hand className="w-5 h-5" />
        </button>

        <div className="h-6 w-[1px] bg-slate-700 mx-0.5" />

        {/* Palm Rejection / Pen-Only Mode */}
        <button
          onClick={onTogglePenOnlyTouch}
          className={`p-2 sm:p-2.5 rounded-xl font-medium transition-colors flex items-center gap-1 ${
            penOnlyTouch
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
          title={penOnlyTouch ? 'Palm Rejection: BẬT (Chỉ nhận bút để viết, tay dùng cuộn)' : 'Chế độ Cảm ứng: BẬT (Tay cũng viết được)'}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] font-bold hidden md:inline">
            {penOnlyTouch ? 'Palm Guard' : 'All Touch'}
          </span>
        </button>

        <div className="h-6 w-[1px] bg-slate-700 mx-0.5" />

        {/* History: Undo / Redo / Clear */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Hoàn tác (Undo)"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Làm lại (Redo)"
        >
          <Redo2 className="w-5 h-5" />
        </button>
        <button
          onClick={onClearPage}
          className="p-2 rounded-xl text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
          title="Xóa toàn bộ trang bảng này"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        <div className="h-6 w-[1px] bg-slate-700 mx-0.5" />

        {/* Open PDF / Image Document Button */}
        <label
          className="p-2 sm:p-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer bg-slate-800/50 border border-slate-700/60"
          title="Mở tài liệu PDF bài giảng hoặc Ảnh lên bảng vẽ"
        >
          <FolderOpen className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-semibold hidden lg:inline text-indigo-200">Mở PDF/Ảnh</span>
          <input type="file" accept="image/*,.pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
        </label>

        {/* Background Selector Toggle */}
        <button
          onClick={() => {
            setShowBgMenu(!showBgMenu);
            setShowPenMenu(false);
            setShowShapeMenu(false);
            setShowExportMenu(false);
          }}
          className="p-2 sm:p-2.5 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-1"
          title="Đổi mẫu nền bảng chuẩn sư phạm"
        >
          <Palette className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Export Toggle */}
        <button
          onClick={() => {
            setShowExportMenu(!showExportMenu);
            setShowPenMenu(false);
            setShowShapeMenu(false);
            setShowBgMenu(false);
          }}
          className="p-2 sm:p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          title="Xuất bài giảng ra Ảnh PNG / PDF"
        >
          <Download className="w-5 h-5" />
          <span className="text-xs font-semibold hidden md:inline">Xuất bài giảng</span>
        </button>

        <div className="h-6 w-[1px] bg-slate-700 mx-0.5" />

        {/* Page Nav */}
        <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl px-2 py-1 border border-slate-700">
          <button
            onClick={onPrevPage}
            disabled={currentPageIndex === 0}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
            title="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-semibold px-1 text-emerald-400">
            {currentPageIndex + 1}/{totalPages}
          </span>
          <button
            onClick={onNextPage}
            disabled={currentPageIndex === totalPages - 1}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
            title="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onAddPage}
            className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
            title="Thêm trang mới"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleDrawer}
            className="p-1 hover:bg-slate-700 text-slate-300 rounded transition-colors ml-1"
            title="Quản lý danh sách trang"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
