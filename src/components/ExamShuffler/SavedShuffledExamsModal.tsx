import React, { useState } from 'react';
import {
  FolderArchive,
  X,
  Trash2,
  Download,
  FileText,
  Archive,
  ExternalLink,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';
import type { SavedShuffledExamRecord } from '../../services/shuffledExamStorage';
import {
  createCombinedDocx,
  createMasterAnswerKeyDocx,
  exportAllVariantsAsZip,
} from '../../services/examShufflerService';
import fileSaver from 'file-saver';
const saveAs = (fileSaver as any)?.saveAs || fileSaver;

interface SavedShuffledExamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedExams: SavedShuffledExamRecord[];
  onSelectExam: (examRecord: SavedShuffledExamRecord) => void;
  onDeleteExam: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export const SavedShuffledExamsModal: React.FC<SavedShuffledExamsModalProps> = ({
  isOpen,
  onClose,
  savedExams,
  onSelectExam,
  onDeleteExam,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  if (!isOpen) return null;

  const filteredExams = savedExams.filter((ex) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      ex.title.toLowerCase().includes(q) ||
      ex.originalFileName.toLowerCase().includes(q) ||
      ex.formattedDate.toLowerCase().includes(q) ||
      ex.variantCodes.some((c) => c.toLowerCase().includes(q))
    );
  });

  const handleDownloadZip = async (record: SavedShuffledExamRecord) => {
    try {
      setDownloadingId(`${record.id}_zip`);
      await exportAllVariantsAsZip(record.variants, record.config, record.imageStore || {});
    } catch (e: any) {
      alert(`Lỗi khi tạo file ZIP: ${e.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadCombined = async (record: SavedShuffledExamRecord) => {
    try {
      setDownloadingId(`${record.id}_combined`);
      const blob = await createCombinedDocx(record.variants, record.config, record.imageStore || {});
      saveAs(blob, `De_Tron_Tat_Ca_Ma_De_${record.id}.docx`);
    } catch (e: any) {
      alert(`Lỗi khi tạo file Word gộp: ${e.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAnswerKey = async (record: SavedShuffledExamRecord) => {
    try {
      setDownloadingId(`${record.id}_key`);
      const blob = await createMasterAnswerKeyDocx(record.variants, record.config, record.imageStore || {});
      saveAs(blob, `Bang_Dap_An_Ma_Tran_${record.id}.docx`);
    } catch (e: any) {
      alert(`Lỗi khi tạo file Bảng đáp án: ${e.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Kho Lưu Trữ Đề Đã Trộn
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                  {savedExams.length} bộ đề
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dữ liệu được lưu vĩnh viễn trên trình duyệt của bạn (IndexedDB) – Không bị mất khi tắt app hay tải lại trang.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên đề, môn học, ngày tạo, mã đề..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {savedExams.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              {confirmClearAll ? (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 p-1.5 rounded-xl border border-red-200 dark:border-red-800">
                  <span className="text-xs text-red-600 dark:text-red-400 font-semibold px-1">
                    Xóa tất cả?
                  </span>
                  <button
                    onClick={async () => {
                      await onClearAll();
                      setConfirmClearAll(false);
                    }}
                    className="px-2.5 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer"
                  >
                    Đồng ý
                  </button>
                  <button
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa toàn bộ kho</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y-0">
          {filteredExams.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <FolderArchive className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {searchQuery ? 'Không tìm thấy bộ đề phù hợp' : 'Kho đề đã trộn đang trống'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {searchQuery
                  ? 'Vui lòng kiểm tra lại từ khóa tìm kiếm.'
                  : 'Mỗi khi bạn thực hiện Trộn Đề ở Bước 3, hệ thống sẽ tự động sao lưu toàn bộ các mã đề, ma trận đáp án và bảng điểm vào đây để bạn mở lại hoặc tải file bất kỳ lúc nào.'}
              </p>
            </div>
          ) : (
            filteredExams.map((record) => {
              const isDownloading = downloadingId?.startsWith(record.id);

              return (
                <div
                  key={record.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all space-y-3"
                >
                  {/* Title & Metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                          <Calendar className="w-3 h-3" />
                          {record.formattedDate}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                          <Layers className="w-3 h-3" />
                          {record.variantCodes.length} mã đề ({record.variantCodes.join(', ')})
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          • {record.questionCount} câu hỏi
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {record.title}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-xs sm:max-w-md">File gốc: {record.originalFileName}</span>
                      </div>
                    </div>

                    {/* Delete action */}
                    <div className="flex items-center gap-1 self-end sm:self-start">
                      {confirmDeleteId === record.id ? (
                        <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-1 rounded-xl border border-red-200 dark:border-red-800">
                          <span className="text-[11px] text-red-600 font-bold px-1">Xóa?</span>
                          <button
                            onClick={async () => {
                              await onDeleteExam(record.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded cursor-pointer"
                          >
                            Có
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300 rounded cursor-pointer"
                          >
                            Không
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(record.id)}
                          title="Xóa bộ đề này khỏi kho"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question composition summary badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-500">Cấu trúc:</span>
                    {record.partCounts.part1 > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                        Phần I: {record.partCounts.part1} câu
                      </span>
                    )}
                    {record.partCounts.part2 > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                        Phần II (Đ/S): {record.partCounts.part2} câu
                      </span>
                    )}
                    {record.partCounts.part3 > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                        Phần III: {record.partCounts.part3} câu
                      </span>
                    )}
                    {record.partCounts.part4 > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                        Tự luận: {record.partCounts.part4} câu
                      </span>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {/* Select / View in App */}
                    <button
                      onClick={() => {
                        onSelectExam(record);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xem & Mở lại bộ đề này</span>
                    </button>

                    {/* Download ZIP */}
                    <button
                      onClick={() => handleDownloadZip(record)}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tải ZIP trọn bộ</span>
                    </button>

                    {/* Download Combined DOCX */}
                    <button
                      onClick={() => handleDownloadCombined(record)}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-medium cursor-pointer transition-colors"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>File Word Gộp (.docx)</span>
                    </button>

                    {/* Download Master Answer Key DOCX */}
                    <button
                      onClick={() => handleDownloadAnswerKey(record)}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-medium cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-purple-500" />
                      <span>Bảng Đáp Án (.docx)</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Tự động đồng bộ IndexedDB • Hoạt động 100% offline</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
