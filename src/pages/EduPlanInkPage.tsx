import React, { useState } from 'react';
import { EduPlanInkBoard } from '../components/EduPlanInk/EduPlanInkBoard';
import { Sparkles, Maximize2, Minimize2, HelpCircle, BookOpen, ShieldCheck } from 'lucide-react';

export const EduPlanInkPage: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-white overflow-hidden font-sans">
      {/* Header Navigation Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg tracking-wide">
            <Sparkles className="w-6 h-6 animate-pulse" />
            <span>EduPlan AI Ink</span>
          </div>
          <span className="hidden md:inline px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full">
            Bảng viết / vẽ kỹ thuật số chuyên nghiệp
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Hướng dẫn tính năng</span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Thoát Toàn màn hình' : 'Toàn màn hình giảng dạy'}</span>
          </button>
        </div>
      </header>

      {/* Main Board View */}
      <div className="flex-1 relative w-full h-full min-h-0">
        <EduPlanInkBoard />
      </div>

      {/* Feature Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl text-white shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-lg text-emerald-400">
                <BookOpen className="w-6 h-6" />
                <span>Hướng dẫn sử dụng EduPlan AI Ink</span>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
                <h4 className="font-bold text-emerald-400 mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  1. Chống chạm lòng bàn tay (Palm Rejection) & Bút cảm ứng Stylus
                </h4>
                <p className="text-slate-400">
                  Hệ thống tự động phân tách cảm ứng: Bút stylus (Apple Pencil / Surface Pen) phục vụ viết vẽ tự nhiên theo lực nhấn. Ngón tay vuốt được dùng để cuộn, di chuyển bảng và phóng to/thu nhỏ.
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
                <h4 className="font-bold text-yellow-400 mb-1">
                  2. Bộ công cụ viết vẽ chuyên dụng
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><b>Bút mực:</b> Nét mượt mà tự nhiên, tùy chỉnh màu sắc chuẩn phấn học đường và cỡ nét.</li>
                  <li><b>Bút dạ quang:</b> Độ trong suốt alpha tô đè chữ/công thức không bị nhòe.</li>
                  <li><b>Bút Laser trình chiếu:</b> Nét rực rỡ tự biến mất sau 1s để thu hút sự chú ý.</li>
                  <li><b>Hình học thông minh:</b> Vẽ tự do và tự động nắn thẳng đoạn thẳng, hình chữ nhật, tam giác, đường tròn, hệ trục Oxy.</li>
                  <li><b>Thước kẻ ảo:</b> Thước đo kẻ chuẩn nét với vạch chia centimet và đo góc xoay.</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
                <h4 className="font-bold text-sky-400 mb-1">
                  3. Nền bảng chuẩn sư phạm & Xuất bài giảng
                </h4>
                <p className="text-slate-400">
                  Chuyển đổi nhanh 4 nền bảng: Bảng xanh phấn trắng, Bảng đen, Bảng trắng office, Giấy ô ly học sinh hoặc tải file bài giảng PDF/Ảnh. Xuất toàn bộ bài viết ra ảnh HD PNG hoặc file tài liệu PDF multi-page.
                </p>
              </div>
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={() => setShowGuide(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-xs"
              >
                Đã hiểu, Bắt đầu giảng dạy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EduPlanInkPage;
