import React, { useState } from 'react';
import { 
  Scissors, Plus, Grid3X3, Sliders, Layers, Sparkles, 
  Trash2, RotateCcw, Target, ChevronRight, ChevronLeft, Minimize2, Maximize2
} from 'lucide-react';
import { MathView } from '../../../components/MathView';

interface QuickActionFloatingBarProps {
  selectedVertices: string[];
  onClearSelectedVertices: () => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  sectionSliceValue: number;
  onSectionSliceChange: (val: number) => void;
  hasSliceSlider?: boolean;
}

export const QuickActionFloatingBar: React.FC<QuickActionFloatingBarProps> = ({
  selectedVertices,
  onClearSelectedVertices,
  isInspectorOpen,
  onToggleInspector,
  sectionSliceValue,
  onSectionSliceChange,
  hasSliceSlider = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // If nothing is active to control, do not clutter the 3D viewport
  if (!hasSliceSlider && selectedVertices.length === 0) {
    return null;
  }

  if (isCollapsed) {
    return (
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="p-2.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-emerald-400 border border-slate-700/80 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer"
          title="Mở rộng bảng điều khiển"
        >
          <Sliders className="w-4 h-4" />
          <span>{hasSliceSlider ? 'Mặt cắt (α)' : 'Đỉnh chọn 3D'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 max-w-xs w-64 animate-in fade-in slide-in-from-right-3">
      
      {/* Header & Collapse Button */}
      <div className="bg-slate-900/95 backdrop-blur-md text-white py-1.5 px-3 rounded-xl border border-slate-700/80 shadow-xl flex items-center justify-between text-xs">
        <span className="font-bold text-slate-300 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-emerald-400" />
          Thao Tác Nhanh
        </span>

        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Thu gọn bảng"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Selected Vertices Status Pill */}
      <div className="bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-2xl border border-slate-700/80 shadow-xl flex items-center justify-between gap-2 text-xs">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Đỉnh chọn bóc tách 2D:</p>
          <p className="font-mono font-bold text-amber-400 truncate">
            {selectedVertices.length > 0 ? selectedVertices.join(' → ') : 'Click trực tiếp lên đỉnh 3D'}
          </p>
        </div>

        {selectedVertices.length > 0 && (
          <button
            type="button"
            onClick={onClearSelectedVertices}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Xóa lựa chọn đỉnh"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cross-section Slicing Slider for Level 11/12 */}
      {hasSliceSlider && (
        <div className="bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-2xl border border-slate-700/80 shadow-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Mặt cắt $(\alpha)$:
            </span>
            <span className="font-mono font-bold text-indigo-400">{Math.round(sectionSliceValue * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.95"
            step="0.05"
            value={sectionSliceValue}
            onChange={(e) => onSectionSliceChange(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
        </div>
      )}

    </div>
  );
};
