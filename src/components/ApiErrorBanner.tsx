import React from 'react';
import { AlertTriangle, Key, RefreshCw, X, HelpCircle, Sparkles } from 'lucide-react';

interface ApiErrorBannerProps {
  error: string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function isQuotaOrApiError(errorMsg?: string | null): boolean {
  if (!errorMsg) return false;
  const lower = errorMsg.toLowerCase();
  return (
    lower.includes('quota') ||
    lower.includes('exceeded') ||
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('limit exceeded') ||
    lower.includes('free tier') ||
    lower.includes('resource_exhausted') ||
    lower.includes('api_key') ||
    lower.includes('unauthenticated') ||
    lower.includes('quá tải') ||
    lower.includes('hạn mức')
  );
}

export const ApiErrorBanner: React.FC<ApiErrorBannerProps> = ({
  error,
  onDismiss,
  onRetry,
  className = ""
}) => {
  if (!error) return null;

  const isQuota = isQuotaOrApiError(error);

  const handleOpenApiKeyModal = () => {
    window.dispatchEvent(new CustomEvent('show-api-key-modal'));
  };

  return (
    <div className={`p-4 bg-rose-50/95 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded-xl shadow-xs text-rose-900 dark:text-rose-100 transition-all animate-in fade-in slide-in-from-top-2 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-lg shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-rose-900 dark:text-rose-100 flex items-center gap-2">
            {isQuota ? "⚠️ Hệ thống AI tạm thời vượt quá hạn mức miễn phí (Lỗi 429 / Rate Limit)" : "Đã xảy ra sự cố kết nối AI"}
          </h4>

          <p className="text-xs text-rose-800 dark:text-rose-200 mt-1 leading-relaxed">
            {isQuota ? (
              <span>
                Hạn mức lượt tạo AI miễn phí mặc định của máy chủ trong ngày đã đạt giới hạn. Để tiếp tục sử dụng ứng dụng ngay lập tức không bị gián đoạn, thầy/cô vui lòng <b>nhập API Key cá nhân</b> (Miễn phí 100% do Google cấp).
              </span>
            ) : (
              error
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-3">
            <button
              type="button"
              onClick={handleOpenApiKeyModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>🔑 Cài đặt API Key cá nhân (Miễn phí 100%)</span>
            </button>

            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-rose-200 dark:border-rose-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại ngay</span>
              </button>
            )}

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-800 text-xs font-medium transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Đóng</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
