import { useState, useEffect } from "react";
import { 
  X, Key, Save, BookOpen, Plus, Trash2, RotateCcw, 
  CheckCircle2, Settings 
} from "lucide-react";
import { useSubjects } from "../lib/subjects";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "apikey" | "subjects";
}

export function SettingsModal({ isOpen, onClose, defaultTab }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"apikey" | "subjects">(defaultTab || "apikey");
  const [apiKey, setApiKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const { subjects, addSubject, removeSubject, resetSubjects } = useSubjects();
  const [newSubjectInput, setNewSubjectInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (defaultTab) {
        setActiveTab(defaultTab);
      }
      const storedKey = localStorage.getItem("eduplan_gemini_api_key_v2") || "";
      setApiKey(storedKey);
      setIsSaved(false);
      setNewSubjectInput("");
    }
  }, [isOpen, defaultTab]);

  const handleSaveApiKey = () => {
    localStorage.setItem("eduplan_gemini_api_key_v2", apiKey.trim());
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            Cài đặt Hệ thống
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("apikey")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "apikey"
                ? "border-emerald-600 text-emerald-600 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-800"
            }`}
          >
            <Key className="w-4 h-4" />
            API Key
          </button>

          <button
            onClick={() => setActiveTab("subjects")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "subjects"
                ? "border-emerald-600 text-emerald-600 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Danh mục Môn học ({subjects.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: API KEY */}
          {activeTab === "apikey" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Gemini API Key cá nhân
                </label>
                <input
                  type="password"
                  placeholder="Nhập API Key cá nhân từ AI Studio..."
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setIsSaved(false);
                  }}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-800 font-mono text-sm"
                />
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  🔒 <strong>An toàn:</strong> Key này được lưu trữ cục bộ riêng trên trình duyệt máy của Thầy/Cô. Khi học sinh làm bài thi qua link, mã key này <strong>hoàn toàn không được gửi đi</strong> và không thể bị học sinh hay người ngoài trích xuất.
                </p>
                
                <div className="mt-4 p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Cách lấy API Key miễn phí từ Google AI Studio:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                    <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline font-semibold">aistudio.google.com/app/apikey</a></li>
                    <li>Đăng nhập bằng tài khoản Google cá nhân</li>
                    <li>Nhấn nút <strong>Create API Key</strong></li>
                    <li>Sao chép mã Key và dán vào ô bên trên rồi bấm "Lưu API Key"</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DANH MỤC MÔN HỌC */}
          {activeTab === "subjects" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Quản lý Môn học và Hoạt động giáo dục</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Thêm, xóa hoặc khôi phục danh mục môn học và hoạt động giáo dục (áp dụng chung cho Kế hoạch bài dạy, KHDH khuyết tật, Phiếu học tập và Kiểm tra).
                </p>

                {/* Add new subject input */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Nhập tên môn học hoặc hoạt động GD mới..."
                    value={newSubjectInput}
                    onChange={(e) => setNewSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newSubjectInput.trim()) {
                          addSubject(newSubjectInput);
                          setNewSubjectInput("");
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSubjectInput.trim()) {
                        addSubject(newSubjectInput);
                        setNewSubjectInput("");
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm
                  </button>
                </div>

                {/* Subject list */}
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {subjects.map((sub, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-sm">
                      <span className="font-medium text-slate-800">{sub}</span>
                      <button
                        onClick={() => removeSubject(sub)}
                        title="Xóa môn học/hoạt động"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (confirm("Bạn có chắc chắn muốn khôi phục lại danh mục mặc định ban đầu?")) {
                        resetSubjects();
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Khôi phục mặc định GDPT 2018
                  </button>
                  <span className="text-xs text-slate-400">Tổng số: {subjects.length} mục</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
          {activeTab === "apikey" && (
            <button
              onClick={handleSaveApiKey}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              {isSaved ? "Đã lưu!" : "Lưu API Key"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
