import React from 'react';
import { 
  Box, Layers, Compass, Scissors, Eye, RotateCcw, 
  Download, Sparkles, Grid3X3, ArrowRight, Play, CheckCircle2, PenTool
} from 'lucide-react';
import { GradeLevel, GeometryPreset } from '../types/geometry.types';
import { GEOMETRY_PRESETS } from '../utils/ggbCommandBuilder';

interface GeoHeaderToolbarProps {
  selectedGrade: GradeLevel;
  onSelectGrade: (grade: GradeLevel) => void;
  activePreset: GeometryPreset;
  onSelectPreset: (preset: GeometryPreset) => void;
  isOxyzActive: boolean;
  onToggleOxyz: () => void;
  isUnfoldActive: boolean;
  onToggleUnfold: () => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  isSketchActive: boolean;
  onToggleSketch: () => void;
  onResetCamera: () => void;
  onExportPng: () => void;
}

export const GeoHeaderToolbar: React.FC<GeoHeaderToolbarProps> = ({
  selectedGrade,
  onSelectGrade,
  activePreset,
  onSelectPreset,
  isOxyzActive,
  onToggleOxyz,
  isUnfoldActive,
  onToggleUnfold,
  isInspectorOpen,
  onToggleInspector,
  isSketchActive,
  onToggleSketch,
  onResetCamera,
  onExportPng
}) => {
  const currentGradePresets = GEOMETRY_PRESETS.filter(p => p.gradeLevel === selectedGrade);

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-white flex flex-wrap items-center justify-between gap-3 shadow-md shrink-0 z-20">
      
      {/* Grade Selector Tabs */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-base mr-3">
          <Box className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">Spatial Geometry Studio</span>
        </div>

        <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
          <button
            type="button"
            onClick={() => {
              onSelectGrade('THCS');
              const first = GEOMETRY_PRESETS.find(p => p.gradeLevel === 'THCS');
              if (first) onSelectPreset(first);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              selectedGrade === 'THCS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            THCS (Lớp 7-9)
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectGrade('Lop11');
              const first = GEOMETRY_PRESETS.find(p => p.gradeLevel === 'Lop11');
              if (first) onSelectPreset(first);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              selectedGrade === 'Lop11'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            THPT Lớp 11
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectGrade('Lop12');
              const first = GEOMETRY_PRESETS.find(p => p.gradeLevel === 'Lop12');
              if (first) onSelectPreset(first);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              selectedGrade === 'Lop12'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            THPT Lớp 12 (Oxyz)
          </button>
        </div>
      </div>

      {/* Preset Selector Dropdown */}
      <div className="flex items-center gap-2 flex-1 max-w-xs min-w-[200px]">
        <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
        <select
          value={activePreset.id}
          onChange={(e) => {
            const found = GEOMETRY_PRESETS.find(p => p.id === e.target.value);
            if (found) onSelectPreset(found);
          }}
          className="w-full bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          {currentGradePresets.map(preset => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        
        {/* Unfold Net 2D (For THCS) */}
        {activePreset.unfoldAvailable && (
          <button
            type="button"
            onClick={onToggleUnfold}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isUnfoldActive
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title="Bóc vỏ / Trải phẳng hình 3D sang 2D (Net 2D) để tính diện tích xung quanh & toàn phần"
          >
            <Scissors className="w-4 h-4 text-indigo-300" />
            <span>{isUnfoldActive ? 'Tắt Bóc Vỏ 2D' : 'Bóc Vỏ Net 2D'}</span>
          </button>
        )}

        {/* Oxyz Toggle (For Lop12 or Lop11) */}
        <button
          type="button"
          onClick={onToggleOxyz}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            isOxyzActive
              ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
          }`}
          title="Bật/tắt Gắn hệ trục tọa độ Oxyz trực quan"
        >
          <Grid3X3 className="w-4 h-4 text-purple-300" />
          <span>{isOxyzActive ? 'Ẩn Hệ Trục Oxyz' : 'Gắn Trục Oxyz'}</span>
        </button>

        {/* Planar Extraction Inspector Toggle */}
        <button
          type="button"
          onClick={onToggleInspector}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            isInspectorOpen
              ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
          }`}
          title="Bóc tách mặt phẳng 3D sang 2D chuẩn kích thước Euclid"
        >
          <Compass className="w-4 h-4 text-amber-300" />
          <span>{isInspectorOpen ? 'Ẩn Cửa Sổ 2D' : 'Bóc Tách Mặt 2D'}</span>
        </button>

        {/* Freehand Sketch Toggle */}
        <button
          type="button"
          onClick={onToggleSketch}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            isSketchActive
              ? 'bg-rose-600 text-white border-rose-500 shadow-sm animate-pulse'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
          }`}
          title="Bật/Tắt chế độ Bút vẽ nháp bằng chuột hoặc bút cảm ứng trực tiếp trên hình 3D"
        >
          <PenTool className="w-4 h-4 text-rose-300" />
          <span>{isSketchActive ? 'Thoát Bút Vẽ' : 'Vẽ Nháp'}</span>
        </button>

        {/* Reset Camera */}
        <button
          type="button"
          onClick={onResetCamera}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
          title="Xoay về góc nhìn camera chuẩn 360°"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Export PNG */}
        <button
          type="button"
          onClick={onExportPng}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          title="Xuất hình vẽ 3D độ nét cao (PNG) chèn vào Word/Đề thi"
        >
          <Download className="w-4 h-4" />
          <span className="hidden md:inline">Xuất Ảnh PNG</span>
        </button>

      </div>
    </header>
  );
};
