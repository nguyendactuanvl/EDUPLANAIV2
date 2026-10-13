import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Loader2,
  FolderCheck,
  FileText,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { uploadFileToGoogleDrive, DriveFileItem } from '../lib/googleDrive';
import { googleSignIn, getCachedToken } from '../lib/googleAuth';

interface GoogleDriveSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileBlob: Blob | null;
  fileName: string;
  fileType: 'doc' | 'pdf' | 'json';
  subFolder?: string;
  onSaveSuccess?: (driveItem: DriveFileItem) => void;
}

export function GoogleDriveSaveModal({
  isOpen,
  onClose,
  fileBlob,
  fileName,
  fileType,
  subFolder = "Tài Liệu Xuất",
  onSaveSuccess
}: GoogleDriveSaveModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedItem, setUploadedItem] = useState<DriveFileItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const getMimeType = () => {
    if (fileType === 'pdf') return 'application/pdf';
    if (fileType === 'doc') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return 'application/json';
  };

  const getFileExtension = () => {
    if (fileType === 'pdf') return '.pdf';
    if (fileType === 'doc') return '.docx';
    return '.json';
  };

  const fullFileName = fileName.endsWith(getFileExtension()) ? fileName : `${fileName}${getFileExtension()}`;

  const handleStartUpload = async () => {
    if (!fileBlob) {
      setErrorMsg("Không có dữ liệu tệp để tải lên.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      let token = getCachedToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (!authRes) {
          setIsUploading(false);
          return;
        }
      }

      const item = await uploadFileToGoogleDrive(
        fileBlob,
        fullFileName,
        getMimeType(),
        subFolder
      );

      setUploadedItem(item);
      if (onSaveSuccess) onSaveSuccess(item);
    } catch (err: any) {
      console.error("Lỗi lưu Google Drive:", err);
      setErrorMsg(err.message || "Không thể lưu tệp lên Google Drive. Vui lòng kiểm tra kết nối mạng.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyLink = () => {
    if (!uploadedItem?.webViewLink) return;
    navigator.clipboard.writeText(uploadedItem.webViewLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Cloud className="w-5 h-5 text-sky-200 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Lưu Vào Google Drive Cá Nhân</h3>
              <p className="text-xs text-blue-100">Đồng bộ đám mây chính chủ Google Drive</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full text-blue-100 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          
          {/* File Card Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="font-bold text-sm text-slate-800 truncate" title={fullFileName}>
                {fullFileName}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Thư mục đích: <span className="font-semibold text-blue-700">Tài Liệu EduPlan GDPT 2018 / {subFolder}</span>
              </p>
            </div>
          </div>

          {/* Success State */}
          {uploadedItem ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-sm">
                <FolderCheck className="w-5 h-5 text-emerald-600" />
                <span>Đã lưu thành công vào Google Drive!</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Tệp đã được đưa lên tài khoản Google Drive cá nhân của thầy/cô. Thầy/cô có thể mở trực tiếp để xem, chỉnh sửa hoặc chia sẻ.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={uploadedItem.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Trên Google Drive</span>
                </a>

                <button
                  onClick={handleCopyLink}
                  className="py-2 px-3 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Đã sao chép' : 'Sao chép link'}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                Nhấn nút bên dưới để tải trực tiếp file lên tài khoản Google Drive của thầy/cô. Tệp sẽ được phân loại tự động vào thư mục chính quy <b>"Tài Liệu EduPlan GDPT 2018"</b>.
              </p>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          {uploadedItem ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Hoàn tất
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy
              </button>

              <button
                onClick={handleStartUpload}
                disabled={isUploading || !fileBlob}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-200" />
                    <span>Đang tải lên Drive...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 text-blue-200" />
                    <span>Xác nhận Tải Lên Google Drive</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
