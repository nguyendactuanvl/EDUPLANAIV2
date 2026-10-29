import React, { useState, useEffect } from 'react';
import { Zap, RefreshCw, Trash2, Database, CheckCircle2, ShieldCheck } from 'lucide-react';
import { aiCacheService } from '../services/aiCacheService';

interface AiCacheIndicatorProps {
  isFromCache?: boolean;
  cachedAt?: number;
  hits?: number;
  onForceRefresh?: () => void;
  moduleName?: string;
  className?: string;
}

export const AiCacheIndicator: React.FC<AiCacheIndicatorProps> = ({
  isFromCache,
  cachedAt,
  hits = 0,
  onForceRefresh,
  moduleName = 'exam',
  className = ''
}) => {
  const [showManageModal, setShowManageModal] = useState(false);
  const [stats, setStats] = useState<{ count: number; totalSizeBytes: number; modules: Record<string, number> }>({
    count: 0,
    totalSizeBytes: 0,
    modules: {}
  });

  const loadStats = async () => {
    const s = await aiCacheService.getStats();
    setStats(s);
  };

  useEffect(() => {
    loadStats();
  }, [isFromCache]);

  const handleClearCache = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ bộ nhớ đệm phản hồi AI?')) {
      await aiCacheService.clear();
      await loadStats();
      setShowManageModal(false);
      alert('Đã xóa thành công bộ nhớ đệm AI!');
    }
  };

  const formattedTime = cachedAt ? new Date(cachedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
  const formattedDate = cachedAt ? new Date(cachedAt).toLocaleDateString('vi-VN') : '';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {isFromCache ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-semibold animate-in fade-in duration-300">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse shrink-0" />
          <span>
            ⚡ <strong>Đã tải từ Bộ nhớ đệm AI</strong> ({formattedTime} {formattedDate} {hits > 1 ? `• ${hits} lượt dùng` : ''})
          </span>

          {onForceRefresh && (
            <button
              type="button"
              onClick={onForceRefresh}
              className="ml-1 px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              title="Bỏ qua bộ nhớ đệm và yêu cầu AI sinh lại kết quả mới"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Tạo bản mới</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>AI Cache active</span>
        </div>
      )}

      {/* Button to open cache manager */}
      <button
        type="button"
        onClick={() => {
          loadStats();
          setShowManageModal(true);
        }}
        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-colors cursor-pointer"
        title="Quản lý Bộ nhớ đệm AI (Cache)"
      >
        <Database className="w-3.5 h-3.5" />
      </button>

      {/* Cache Manager Modal */}
      {showManageModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
                  <Zap className="w-5 h-5 fill-indigo-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Bộ nhớ đệm phản hồi AI</h3>
                  <p className="text-xs text-slate-500">IndexedDB Cache & Web Worker Acceleration</p>
                </div>
              </div>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2 border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Số bản lưu AI trong máy:</span>
                  <span className="font-extrabold text-indigo-600 text-sm">{stats.count} bản</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Dung lượng ước tính:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {(stats.totalSizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tối ưu hóa tốc độ 0ms</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Khi tạo lại cùng một ma trận đề hoặc phiếu học tập, hệ thống sẽ tự động trả về phản hồi tức thì từ bộ nhớ đệm IndexedDB cục bộ mà không tốn thời gian gọi lại API. Các tác vụ định dạng LaTeX và phân tích câu hỏi cũng được xử lý trên Web Worker ngầm để không làm gián đoạn giao diện.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleClearCache}
                disabled={stats.count === 0}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa bộ nhớ đệm</span>
              </button>

              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
