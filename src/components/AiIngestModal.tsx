import React, { useState } from 'react';
import { Sparkles, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ingestQuestionsWithAI } from '../services/aiIngestionService';

interface AiIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

export function AiIngestModal({ isOpen, onClose, onSuccess }: AiIngestModalProps) {
  const [grade, setGrade] = useState<10 | 11 | 12>(11);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleIngest = async () => {
    if (!rawText.trim()) {
      setResultMessage({ type: 'error', text: 'Vui lòng dán nội dung đề thô cần nạp.' });
      return;
    }

    setLoading(true);
    setResultMessage(null);

    try {
      const res = await ingestQuestionsWithAI(rawText, grade);
      if (res.success) {
        setResultMessage({ type: 'success', text: `✨ Nạp thành công ${res.count} câu hỏi vào Ngân hàng Supabase!` });
        setRawText('');
        if (onSuccess) onSuccess(res.count);
        setTimeout(() => {
          onClose();
          setResultMessage(null);
        }, 2000);
      } else {
        setResultMessage({ type: 'error', text: res.error || 'Có lỗi xảy ra khi nạp câu hỏi.' });
      }
    } catch (err: any) {
      setResultMessage({ type: 'error', text: err.message || 'Lỗi hệ thống.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Nạp Câu Hỏi Bằng AI vào Supabase</h3>
              <p className="text-xs text-indigo-100">Tự động phân tích, gán mức độ tư duy & mã bài học chuẩn GDPT 2018</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Chọn khối lớp mặc định
            </label>
            <div className="flex gap-3">
              {[10, 11, 12].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g as 10 | 11 | 12)}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm border transition-all ${
                    grade === g
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Lớp {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Dán nội dung đề thi thô (Word / Text / LaTeX)
            </label>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Dán đề thi gồm câu hỏi, phương án A, B, C, D hoặc Đúng/Sai hoặc trả lời ngắn vào đây... AI sẽ tự động phân tích và lưu trực tiếp vào Supabase."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono leading-relaxed bg-slate-50/50"
            />
          </div>

          {resultMessage && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
                resultMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {resultMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{resultMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-200/80 transition"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleIngest}
            disabled={loading || !rawText.trim()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-indigo-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang phân tích & lưu Supabase...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Phân tích & Tự động lưu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
