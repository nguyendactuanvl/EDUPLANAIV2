import React, { useState, useEffect } from 'react';
import { 
  X, Cloud, CloudUpload, CloudDownload, RefreshCw, Check, AlertCircle, 
  ExternalLink, FileText, Sparkles, FolderCheck, CheckCircle2, ArrowRight
} from 'lucide-react';
import { 
  uploadFileToGoogleDrive, 
  listMatrixDriveFiles, 
  downloadFileFromGoogleDrive, 
  DriveFileItem 
} from '../lib/googleDrive';
import { getCachedToken, googleSignIn } from '../lib/googleAuth';
import { ExamMatrixTemplate } from '../data/matrixLibraryData';

interface GoogleDriveMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemplate: ExamMatrixTemplate;
  onLoadTemplateFromDrive: (templateData: ExamMatrixTemplate) => void;
}

export function GoogleDriveMatrixModal({
  isOpen,
  onClose,
  currentTemplate,
  onLoadTemplateFromDrive
}: GoogleDriveMatrixModalProps) {
  const [activeTab, setActiveTab] = useState<'save' | 'load'>('load');
  const [customFileName, setCustomFileName] = useState<string>(
    `${currentTemplate.title || 'Ma_Tran_De_Thi'}_${currentTemplate.subjectName || 'Toan'}_Lop${currentTemplate.grade || '11'}.matrix.json`
  );

  // States for uploading
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [saveSuccessItem, setSaveSuccessItem] = useState<DriveFileItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // States for downloading
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadSuccessMsg, setLoadSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomFileName(
        `${(currentTemplate.title || 'Ma_Tran_De_Thi').replace(/[\/\\?%*:|"<>]/g, '_')}_Lop${currentTemplate.grade || '11'}.matrix.json`
      );
      if (activeTab === 'load') {
        handleRefreshDriveList();
      }
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Refresh list of matrix files from Google Drive
  const handleRefreshDriveList = async () => {
    setIsLoadingList(true);
    setLoadError(null);
    try {
      let token = getCachedToken();
      if (!token) {
        const auth = await googleSignIn();
        token = auth?.accessToken || null;
      }
      if (!token) {
        setLoadError("Vui lòng đăng nhập tài khoản Google để duyệt kho tài nguyên.");
        setIsLoadingList(false);
        return;
      }
      const files = await listMatrixDriveFiles();
      setDriveFiles(files);
    } catch (err: any) {
      console.error(err);
      setLoadError(err?.message || "Không thể tải danh sách ma trận từ Google Drive.");
    } finally {
      setIsLoadingList(false);
    }
  };

  // Upload current matrix to Google Drive
  const handleSaveToDrive = async () => {
    setIsUploading(true);
    setSaveError(null);
    setSaveSuccessItem(null);

    try {
      let token = getCachedToken();
      if (!token) {
        const auth = await googleSignIn();
        token = auth?.accessToken || null;
      }
      if (!token) {
        throw new Error("Chưa đăng nhập tài khoản Google.");
      }

      const jsonString = JSON.stringify(currentTemplate, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });

      const finalName = customFileName.endsWith('.json') ? customFileName : `${customFileName}.matrix.json`;
      const driveItem = await uploadFileToGoogleDrive(
        blob,
        finalName,
        "application/json",
        "Ma Trận Đề Thi GDPT 2018"
      );

      setSaveSuccessItem(driveItem);
    } catch (err: any) {
      console.error(err);
      setSaveError(err?.message || "Lỗi lưu ma trận lên Google Drive.");
    } finally {
      setIsUploading(false);
    }
  };

  // Download & load matrix from Google Drive
  const handleSelectAndLoadFile = async (file: DriveFileItem) => {
    setDownloadingFileId(file.id);
    setLoadError(null);
    setLoadSuccessMsg(null);

    try {
      const data = await downloadFileFromGoogleDrive(file.id);
      if (!data || typeof data !== 'object') {
        throw new Error("Tệp không đúng định dạng dữ liệu Ma trận đề thi (.json).");
      }

      // Check minimal required fields or construct template
      const templateToLoad: ExamMatrixTemplate = {
        id: data.id || `drive_${Date.now()}`,
        subjectId: data.subjectId || 'toan',
        subjectName: data.subjectName || 'Toán học',
        grade: data.grade || '11',
        semester: data.semester || 'Giữa kì I',
        title: data.title || file.name.replace(/\.json$/i, ''),
        badge: data.badge || 'Google Drive Sync',
        description: data.description || 'Ma trận tải trực tuyến từ tài khoản Google Drive cá nhân.',
        durationMinutes: data.durationMinutes || 90,
        totalPoints: data.totalPoints || 10,
        competencyHeaders: data.competencyHeaders || {
          c1: 'Giải quyết vấn đề',
          c2: 'Tư duy toán học',
          c3: 'Mô hình hoá'
        },
        qCounts: data.qCounts || { mc: 16, tf: 2, sa: 2, essay: 3 },
        matrixRows: data.matrixRows || [],
        specUnits: data.specUnits || [],
        topicsList: data.topicsList || []
      };

      onLoadTemplateFromDrive(templateToLoad);
      setLoadSuccessMsg(`Đã tải & đồng bộ thành công mẫu "${templateToLoad.title}"!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setLoadError(err?.message || "Không thể đọc tệp ma trận từ Google Drive.");
    } finally {
      setDownloadingFileId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 text-white flex justify-between items-center shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-sm ring-1 ring-white/30">
              <Cloud className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg tracking-tight">
                Quản Lý & Đồng Bộ Ma Trận Bằng Google Drive
              </h3>
              <p className="text-xs text-blue-100 mt-0.5 font-medium">
                Lưu trữ kho ma trận đề thi trực tuyến và tải về tái sử dụng nhanh chóng trên mọi thiết bị.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl cursor-pointer transition-all hover:rotate-90 duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 dark:bg-slate-800 p-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('load')}
            className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'load'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CloudDownload className="w-4 h-4 text-blue-600" />
            <span>1. Kho Ma Trận Đã Lưu Trên Drive ({driveFiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('save')}
            className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'save'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CloudUpload className="w-4 h-4 text-indigo-600" />
            <span>2. Lưu Ma Trận Hiện Tại Lên Drive</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* TAB 1: TẢI MA TRẬN TỪ GOOGLE DRIVE */}
          {activeTab === 'load' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Danh Sách File Ma Trận Trực Tuyến
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Chọn một ma trận đã lưu trên Google Drive để đồng bộ tức thì vào Trình biên soạn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshDriveList}
                  disabled={isLoadingList}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin text-blue-600' : ''}`} />
                  <span>Cập nhật</span>
                </button>
              </div>

              {loadError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{loadError}</span>
                </div>
              )}

              {loadSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 font-bold animate-bounce">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{loadSuccessMsg}</span>
                </div>
              )}

              {isLoadingList ? (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Đang kết nối Google Drive và đọc dữ liệu kho tài nguyên...</p>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                  <Cloud className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Chưa có tệp ma trận nào trong thư mục Google Drive của bạn.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Chuyển sang tab <strong>"Lưu Ma Trận Hiện Tại Lên Drive"</strong> để tải lên mẫu ma trận đầu tiên!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {driveFiles.map(f => {
                    const isDownloading = downloadingFileId === f.id;
                    return (
                      <div
                        key={f.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 font-bold text-xs">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                              {f.name}
                            </h5>
                            <span className="text-[10px] text-slate-500 block">
                              Ngày tạo: {f.createdTime ? new Date(f.createdTime).toLocaleString('vi-VN') : 'Mới đây'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={f.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                            title="Mở xem trực tiếp trên Google Drive"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            disabled={isDownloading}
                            onClick={() => handleSelectAndLoadFile(f)}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CloudDownload className="w-3.5 h-3.5" />
                            )}
                            <span>{isDownloading ? 'Đang nạp...' : 'Nạp Ma Trận'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LƯU MA TRẬN LÊN GOOGLE DRIVE */}
          {activeTab === 'save' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <FolderCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Ma Trận Đang Được Chọn Để Lưu
                  </h4>
                </div>

                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-black text-[10px] uppercase">
                    {currentTemplate.subjectName} • Lớp {currentTemplate.grade}
                  </span>
                  <h5 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {currentTemplate.title}
                  </h5>
                  <p className="text-xs text-slate-500">
                    Số câu: {currentTemplate.qCounts?.mc || 0} TN + {currentTemplate.qCounts?.tf || 0} Đ/S + {currentTemplate.qCounts?.sa || 0} TLN + {currentTemplate.qCounts?.essay || 0} TL • Thời gian: {currentTemplate.durationMinutes} phút
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên tệp lưu trên Google Drive:
                  </label>
                  <input
                    type="text"
                    value={customFileName}
                    onChange={e => setCustomFileName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Thư mục tự động: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">Tài Liệu EduPlan GDPT 2018 / Ma Trận Đề Thi GDPT 2018</code>
                  </span>
                </div>
              </div>

              {saveError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccessItem && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Đã lưu ma trận lên Google Drive thành công!</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Tệp <strong>{saveSuccessItem.name}</strong> đã sẵn sàng trên đám mây cá nhân của thầy/cô.
                  </p>
                  <div className="pt-1">
                    <a
                      href={saveSuccessItem.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 transition-all"
                    >
                      <span>Xem tệp trên Google Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleSaveToDrive}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-extrabold rounded-xl text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  <span>{isUploading ? 'Đang tải lên Google Drive...' : 'Tải Ma Trận Lên Google Drive'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500">
            Dữ liệu đồng bộ trực tiếp với tài khoản Google Drive bảo mật của bạn.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
