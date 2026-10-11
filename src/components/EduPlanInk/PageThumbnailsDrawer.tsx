import React from 'react';
import { Plus, Trash2, Layers, Check, X, MoveUp, MoveDown } from 'lucide-react';
import { BoardPage, BackgroundType } from './types';

interface PageThumbnailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pages: BoardPage[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDeletePage: (index: number) => void;
  onChangeBackground: (bg: BackgroundType) => void;
}

export const PageThumbnailsDrawer: React.FC<PageThumbnailsDrawerProps> = ({
  isOpen,
  onClose,
  pages,
  currentPageIndex,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onChangeBackground
}) => {
  if (!isOpen) return null;

  const bgOptions: { type: BackgroundType; label: string; color: string; border: string }[] = [
    { type: 'green_board', label: 'Bảng xanh phấn trắng', color: 'bg-[#0d382c] text-white', border: 'border-emerald-600' },
    { type: 'blackboard', label: 'Bảng đen truyền thống', color: 'bg-[#18181b] text-white', border: 'border-zinc-700' },
    { type: 'whiteboard', label: 'Bảng trắng văn phòng', color: 'bg-white text-slate-800', border: 'border-slate-300' },
    { type: 'grid_paper', label: 'Giấy ô ly học sinh', color: 'bg-sky-50 text-slate-800', border: 'border-sky-300' },
    { type: 'lines_paper', label: 'Giấy kẻ ngang', color: 'bg-amber-50/50 text-slate-800', border: 'border-amber-300' },
  ];

  const currentBg = pages[currentPageIndex]?.backgroundType || 'green_board';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border-l border-slate-700/60 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-base text-emerald-400">
          <Layers className="w-5 h-5" />
          <span>Danh sách trang bài giảng ({pages.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Background Preset Selector */}
      <div className="p-4 border-b border-slate-800">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
          Mẫu nền trang hiện tại
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {bgOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => onChangeBackground(opt.type)}
              className={`p-2 text-xs rounded-lg border font-medium flex items-center justify-between transition-all ${
                currentBg === opt.type
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-sm'
                  : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {currentBg === opt.type && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {pages.map((page, idx) => {
          const isSelected = idx === currentPageIndex;
          let previewBgClass = 'bg-[#0d382c]';
          if (page.backgroundType === 'blackboard') previewBgClass = 'bg-[#18181b]';
          if (page.backgroundType === 'whiteboard') previewBgClass = 'bg-white text-slate-800';
          if (page.backgroundType === 'grid_paper') previewBgClass = 'bg-slate-100 text-slate-800';
          if (page.backgroundType === 'lines_paper') previewBgClass = 'bg-amber-50 text-slate-800';

          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(idx)}
              className={`group relative rounded-xl border-2 p-3 transition-all cursor-pointer ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-700 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              {/* Thumbnail Container */}
              <div className={`w-full h-28 rounded-lg overflow-hidden border border-slate-700/80 mb-2 relative flex items-center justify-center ${previewBgClass}`}>
                <div className="text-xs opacity-60 font-medium">
                  {page.strokes.length} nét vẽ, {page.texts.length} văn bản
                </div>
                <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-emerald-400 border border-slate-700">
                  Trang {idx + 1}
                </div>
              </div>

              {/* Info & Actions */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Trang {idx + 1}</span>
                {pages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(idx);
                    }}
                    className="p-1 rounded hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                    title="Xóa trang này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Add Page */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onAddPage}
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm trang mới</span>
        </button>
      </div>
    </div>
  );
};
