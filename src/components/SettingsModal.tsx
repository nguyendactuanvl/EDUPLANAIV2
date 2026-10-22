import { useState, useEffect } from "react";
import { 
  X, Key, Save, BookOpen, Plus, Trash2, RotateCcw, 
  ShieldCheck, Lock, Unlock, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Globe, HelpCircle 
} from "lucide-react";
import { useSubjects } from "../lib/subjects";
import { 
  getSecuritySettings, 
  setTeacherPasscode, 
  disableTeacherPasscode, 
  lockTeacherWorkspace 
} from "../lib/appSecurity";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "apikey" | "security" | "subjects";
}

export function SettingsModal({ isOpen, onClose, defaultTab }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"apikey" | "security" | "subjects">(defaultTab || "apikey");
  const [apiKey, setApiKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // Security state
  const [securitySettings, setSecuritySettings] = useState(getSecuritySettings());
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinHint, setPinHint] = useState("");
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(-1);
  const [currentPinToDisable, setCurrentPinToDisable] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      
      const sec = getSecuritySettings();
      setSecuritySettings(sec);
      setIsLockEnabled(sec.isEnabled);
      setPinHint(sec.hint || "");
      setAutoLockTimeout(sec.autoLockTimeoutMinutes);
      setNewPin("");
      setConfirmPin("");
      setCurrentPinToDisable("");
      setSecurityFeedback(null);
    }
  }, [isOpen, defaultTab]);

  const handleSaveApiKey = () => {
    localStorage.setItem("eduplan_gemini_api_key_v2", apiKey.trim());
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleApplySecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityFeedback(null);

    // If enabling or updating PIN
    if (isLockEnabled) {
      if (!securitySettings.isEnabled || newPin.trim()) {
        if (!newPin || newPin.trim().length < 4) {
          setSecurityFeedback({ type: "error", text: "Mã PIN phải có tối thiểu 4 ký tự hoặc số." });
          return;
        }
        if (newPin !== confirmPin) {
          setSecurityFeedback({ type: "error", text: "Xác nhận mã PIN không trùng khớp." });
          return;
        }

        const success = setTeacherPasscode(newPin, pinHint, autoLockTimeout);
        if (success) {
          const updated = getSecuritySettings();
          setSecuritySettings(updated);
          setNewPin("");
          setConfirmPin("");
          setSecurityFeedback({ type: "success", text: "Đã bật và lưu mã PIN bảo vệ không gian Giáo viên thành công!" });
        } else {
          setSecurityFeedback({ type: "error", text: "Không thể lưu mã PIN. Vui lòng thử lại." });
        }
      } else {
        // Just updating timeout or hint
        const updated = {
          ...securitySettings,
          hint: pinHint.trim(),
          autoLockTimeoutMinutes: autoLockTimeout
        };
        localStorage.setItem("eduplan_security_settings_v1", JSON.stringify(updated));
        setSecuritySettings(updated);
        setSecurityFeedback({ type: "success", text: "Đã cập nhật cấu hình bảo mật thành công!" });
      }
    } else {
      // Disabling lock
      if (securitySettings.isEnabled) {
        if (!currentPinToDisable.trim()) {
          setSecurityFeedback({ type: "error", text: "Vui lòng nhập mã PIN hiện tại để tắt bảo vệ." });
          return;
        }
        const ok = disableTeacherPasscode(currentPinToDisable);
        if (ok) {
          const updated = getSecuritySettings();
          setSecuritySettings(updated);
          setCurrentPinToDisable("");
          setSecurityFeedback({ type: "success", text: "Đã tắt mã PIN bảo vệ không gian Giáo viên." });
        } else {
          setSecurityFeedback({ type: "error", text: "Mã PIN hiện tại không chính xác. Không thể tắt bảo vệ." });
        }
      }
    }
  };

  const handleLockNow = () => {
    onClose();
    lockTeacherWorkspace();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Cài đặt Hệ thống & Bảo mật Web
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
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "security"
                ? "border-emerald-600 text-emerald-600 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-800"
            }`}
          >
            <Lock className="w-4 h-4" />
            Bảo mật & Khóa Web {securitySettings.isEnabled && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
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
                  🔒 <strong>An toàn tuyệt đối:</strong> Key này được lưu trữ cục bộ riêng trên trình duyệt máy của Thầy/Cô. Khi học sinh làm bài thi qua link, mã key này <strong>hoàn toàn không được gửi đi</strong> và không thể bị học sinh hay người ngoài trích xuất.
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
                    <li>Sao chép mã Key và dán vào ô bên trên rồi bấm "Lưu cài đặt"</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BẢO MẬT & KHÓA ỨNG DỤNG WEB */}
          {activeTab === "security" && (
            <div className="space-y-5">
              
              {/* Feedback alert */}
              {securityFeedback && (
                <div className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 border ${
                  securityFeedback.type === "success" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  {securityFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{securityFeedback.text}</span>
                </div>
              )}

              {/* Status Header */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${securitySettings.isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {securitySettings.isEnabled ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Khóa bảo vệ không gian Giáo viên (App Lock)
                    </h4>
                    <p className="text-xs text-slate-500">
                      {securitySettings.isEnabled 
                        ? "Đang kích hoạt: Bất kỳ ai vào web phải nhập PIN mới xem được giáo án & công cụ của GV." 
                        : "Đang tắt: Ai có link web đều có thể vào giao diện soạn thảo của GV."}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLockEnabled}
                    onChange={(e) => {
                      setIsLockEnabled(e.target.checked);
                      setSecurityFeedback(null);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Security Form */}
              <form onSubmit={handleApplySecurity} className="space-y-4">
                {isLockEnabled ? (
                  <div className="space-y-4 p-4 border border-emerald-100 bg-emerald-50/30 rounded-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {securitySettings.isEnabled ? "Đặt lại mã PIN mới (Để trống nếu giữ nguyên)" : "Mã PIN bảo vệ (4-8 ký tự / số) *"}
                        </label>
                        <div className="relative">
                          <input
                            type={showPinInput ? "text" : "password"}
                            placeholder={securitySettings.isEnabled ? "Nhập nếu muốn đổi..." : "Ví dụ: 2026 hoặc 8888"}
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            className="w-full px-3 py-2 pr-9 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPinInput(!showPinInput)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            {showPinInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Xác nhận mã PIN *
                        </label>
                        <input
                          type={showPinInput ? "text" : "password"}
                          placeholder="Nhập lại mã PIN..."
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Gợi ý mã PIN (Khi quên)
                        </label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Năm sinh hoặc 4 số cuối điện thoại..."
                          value={pinHint}
                          onChange={(e) => setPinHint(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Thời gian tự động khóa
                        </label>
                        <select
                          value={autoLockTimeout}
                          onChange={(e) => setAutoLockTimeout(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value={-1}>Khóa khi đóng trình duyệt / đóng tab (Khuyên dùng)</option>
                          <option value={15}>Sau 15 phút không hoạt động</option>
                          <option value={30}>Sau 30 phút không hoạt động</option>
                          <option value={60}>Sau 60 phút không hoạt động</option>
                          <option value={0}>Chỉ khóa khi bấm nút "Khóa ngay" thủ công</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-[11px] text-slate-500">
                        Email phục hồi khẩn cấp: <strong>DactuanDHSP@gmail.com</strong>
                      </p>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        Lưu thiết lập Bảo mật
                      </button>
                    </div>
                  </div>
                ) : (
                  securitySettings.isEnabled && (
                    <div className="p-4 border border-rose-200 bg-rose-50/50 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-rose-700 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Xác nhận tắt khóa bảo vệ không gian Giáo viên:</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="Nhập mã PIN hiện tại để tắt..."
                          value={currentPinToDisable}
                          onChange={(e) => setCurrentPinToDisable(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Tắt bảo vệ
                        </button>
                      </div>
                    </div>
                  )
                )}
              </form>

              {/* Action: Lock Immediately */}
              {securitySettings.isEnabled && (
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">Muốn rời khỏi máy tính ngay?</p>
                    <p>Khóa màn hình làm việc tức thì để học sinh hoặc người ngoài không xem trộm.</p>
                  </div>
                  <button
                    onClick={handleLockNow}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Khóa ngay</span>
                  </button>
                </div>
              )}

              {/* Security Architecture Guide for Web */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  3 Tầng Bảo vệ chống truy cập trái phép trên Web:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] leading-relaxed">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <strong className="text-emerald-700 block mb-0.5">1. Khóa App Lock (Tích hợp)</strong>
                    Học sinh vào link thi <code className="text-indigo-600 bg-slate-100 px-1">/?pin=...</code> vào thẳng bài thi, nhưng nếu cố tình vào trang chủ web sẽ bị chặn bởi màn hình khóa PIN.
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <strong className="text-blue-700 block mb-0.5">2. Cách ly API Key</strong>
                    Toàn bộ API Key Google AI Studio được lưu riêng ở máy giáo viên, không bao giờ kèm theo trong mã đề thi gửi cho học sinh.
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <strong className="text-purple-700 block mb-0.5">3. Cấp độ Tên miền (Hosting)</strong>
                    Nếu triển khai Vercel Pro/Enterprise hoặc Cloudflare Access (miễn phí), có thể bật xác thực Email OTP cho toàn bộ trang web.
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: DANH MỤC MÔN HỌC */}
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
