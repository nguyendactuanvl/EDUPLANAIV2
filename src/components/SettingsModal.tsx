import { useState, useEffect } from "react";
import {
  X,
  Key,
  Save,
  BookOpen,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  HelpCircle,
  Edit3,
  Check,
} from "lucide-react";
import { useSubjects } from "../lib/subjects";
import {
  getApiKeyPool,
  addApiKeysToPool,
  removeApiKeyFromPool,
  clearApiKeyPool,
  toggleApiKeyActive,
  updateApiKeyLabel,
  maskApiKey,
  type ApiKeyPoolItem,
  type ApiKeyStatus,
} from "../lib/apiFetch";
import { testSingleApiKey, testAllApiKeys } from "../services/geminiService";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "apikey" | "subjects";
}

export function SettingsModal({ isOpen, onClose, defaultTab }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"apikey" | "subjects">(defaultTab || "apikey");
  const [keyPool, setKeyPool] = useState<ApiKeyPoolItem[]>([]);
  const [bulkInput, setBulkInput] = useState("");
  const [labelPrefix, setLabelPrefix] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [testingKeyIds, setTestingKeyIds] = useState<Record<string, boolean>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testProgress, setTestProgress] = useState<{ current: number; total: number } | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "info" | "warn"; text: string } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const { subjects, addSubject, removeSubject, resetSubjects } = useSubjects();
  const [newSubjectInput, setNewSubjectInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (defaultTab) {
        setActiveTab(defaultTab);
      }
      setKeyPool(getApiKeyPool());
      setBulkInput("");
      setLabelPrefix("");
      setFeedbackMsg(null);
      setConfirmClearAll(false);
      setIsSaved(false);
      setNewSubjectInput("");
    }
  }, [isOpen, defaultTab]);

  useEffect(() => {
    const handlePoolUpdated = () => {
      setKeyPool(getApiKeyPool());
    };
    window.addEventListener("api-key-pool-updated", handlePoolUpdated);
    return () => {
      window.removeEventListener("api-key-pool-updated", handlePoolUpdated);
    };
  }, []);

  const handleAddBulkKeys = () => {
    if (!bulkInput.trim()) return;
    const { pool, addedCount, duplicateCount } = addApiKeysToPool(bulkInput, labelPrefix);
    setKeyPool(pool);
    setBulkInput("");
    setLabelPrefix("");
    setConfirmClearAll(false);

    if (addedCount > 0 && duplicateCount > 0) {
      setFeedbackMsg({
        type: "success",
        text: `Đã thêm ${addedCount} API Key mới vào danh sách xoay vòng (đã tự động lọc bỏ ${duplicateCount} key trùng lặp).`,
      });
    } else if (addedCount > 0) {
      setFeedbackMsg({
        type: "success",
        text: `Đã thêm thành công ${addedCount} API Key vào danh sách xoay vòng!`,
      });
    } else if (duplicateCount > 0) {
      setFeedbackMsg({
        type: "warn",
        text: `Tất cả ${duplicateCount} API Key vừa dán đều đã tồn tại trong danh sách.`,
      });
    } else {
      setFeedbackMsg({
        type: "warn",
        text: "Không tìm thấy mã API Key hợp lệ trong nội dung vừa dán.",
      });
    }
  };

  const handleToggleReveal = (id: string) => {
    setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleActive = (id: string) => {
    const updated = toggleApiKeyActive(id);
    setKeyPool(updated);
  };

  const handleStartEditLabel = (item: ApiKeyPoolItem) => {
    setEditingId(item.id);
    setEditingLabel(item.label);
  };

  const handleSaveLabel = (id: string) => {
    const updated = updateApiKeyLabel(id, editingLabel);
    setKeyPool(updated);
    setEditingId(null);
  };

  const handleRemoveSingleKey = (id: string) => {
    const updated = removeApiKeyFromPool(id);
    setKeyPool(updated);
    setFeedbackMsg({ type: "info", text: "Đã xóa API Key khỏi danh sách." });
  };

  const handleClearAllKeys = () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      return;
    }
    const updated = clearApiKeyPool();
    setKeyPool(updated);
    setConfirmClearAll(false);
    setFeedbackMsg({ type: "info", text: "Đã xóa toàn bộ danh sách API Key cá nhân." });
  };

  const handleTestSingle = async (item: ApiKeyPoolItem) => {
    setTestingKeyIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      await testSingleApiKey(item);
      setKeyPool(getApiKeyPool());
    } finally {
      setTestingKeyIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleTestAllKeys = async () => {
    if (keyPool.length === 0 || isTestingAll) return;
    setIsTestingAll(true);
    setFeedbackMsg(null);
    setTestProgress({ current: 0, total: keyPool.length });

    try {
      const updated = await testAllApiKeys((current, total, currentPool) => {
        setTestProgress({ current, total });
        setKeyPool([...currentPool]);
      });
      const validCount = updated.filter((k) => k.status === "valid").length;
      const rateLimitedCount = updated.filter((k) => k.status === "rate_limited").length;
      const invalidCount = updated.filter((k) => k.status === "invalid").length;

      setFeedbackMsg({
        type: validCount > 0 ? "success" : "warn",
        text: `Kết quả kiểm tra ${updated.length} Key: ${validCount} Sẵn sàng • ${rateLimitedCount} Tạm quá tải 429 • ${invalidCount} Lỗi key.`,
      });
    } finally {
      setIsTestingAll(false);
      setTestProgress(null);
    }
  };

  const handleSaveAndClose = () => {
    if (bulkInput.trim()) {
      const { pool } = addApiKeysToPool(bulkInput, labelPrefix);
      setKeyPool(pool);
      setBulkInput("");
      setLabelPrefix("");
    }
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const renderStatusBadge = (status?: ApiKeyStatus) => {
    switch (status) {
      case "valid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Sẵn sàng
          </span>
        );
      case "rate_limited":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Tạm quá tải 429
          </span>
        );
      case "invalid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Lỗi key
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            Chưa kiểm tra
          </span>
        );
    }
  };

  if (!isOpen) return null;

  const activeCount = keyPool.filter((k) => k.isActive).length;
  const readyCount = keyPool.filter((k) => k.isActive && k.status === "valid").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            Cài đặt Hệ thống & Quản lý API Key Pool
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
            Danh sách API Key ({activeCount}/{keyPool.length} đang bật)
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
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: API KEY POOL */}
          {activeTab === "apikey" && (
            <div className="space-y-5">
              {/* Security & Privacy Banner */}
              <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-semibold text-emerald-900">Bảo mật & Tự động xoay vòng (Round-Robin + Auto-Fallback): </strong>
                  <span>
                    Danh sách API Key chỉ được lưu cục bộ trên trình duyệt của thầy/cô để chia tải khi soạn bài, hệ thống không thu thập hay gửi dữ liệu này lên máy chủ.
                  </span>
                </div>
              </div>

              {keyPool.length === 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block mb-0.5">Chưa có API Key cá nhân trong danh sách:</strong>
                    Thầy/cô có thể dán 1 hoặc nhiều Gemini API Key bên dưới để hệ thống tự động xoay vòng tuần tự và chuyển đổi dự phòng khi có Key chạm giới hạn 429.
                  </div>
                </div>
              )}

              {/* Bulk Add Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    Thêm nhanh 1 hoặc nhiều API Key cùng lúc
                  </label>
                  <span className="text-xs text-slate-500">
                    Mỗi dòng 1 key • Tự động lọc dòng trống & key trùng lặp
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <textarea
                      rows={3}
                      placeholder={"Dán 1 hoặc nhiều mã API Key (mỗi dòng 1 key):\nAIzaSy...\nKey Gmail 2 | AIzaSy..."}
                      value={bulkInput}
                      onChange={(e) => {
                        setBulkInput(e.target.value);
                        setIsSaved(false);
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-800 font-mono text-xs leading-relaxed resize-y"
                    />
                  </div>
                  <div className="flex flex-col justify-between gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Tên gợi nhớ (tùy chọn)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Key Gmail 1, Key Phụ..."
                        value={labelPrefix}
                        onChange={(e) => setLabelPrefix(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-xs text-slate-800"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddBulkKeys}
                      disabled={!bulkInput.trim()}
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm vào danh sách
                    </button>
                  </div>
                </div>
              </div>

              {/* Feedback Message */}
              {feedbackMsg && (
                <div
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between border ${
                    feedbackMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : feedbackMsg.type === "warn"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <span>{feedbackMsg.text}</span>
                  <button
                    type="button"
                    onClick={() => setFeedbackMsg(null)}
                    className="text-slate-400 hover:text-slate-600 ml-2 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Key Pool List Header & Actions */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">
                      Danh sách API Key đã lưu ({keyPool.length})
                    </h3>
                    {keyPool.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                        Đang bật xoay vòng: <strong>{activeCount}</strong>
                        {readyCount > 0 ? ` • Sẵn sàng: ${readyCount}` : ""}
                      </span>
                    )}
                  </div>

                  {keyPool.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestAllKeys}
                        disabled={isTestingAll}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingAll ? "animate-spin" : ""}`} />
                        {isTestingAll && testProgress
                          ? `Đang kiểm tra (${testProgress.current}/${testProgress.total})...`
                          : "Kiểm tra tất cả Key"}
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAllKeys}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          confirmClearAll
                            ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {confirmClearAll ? "Xác nhận xóa hết?" : "Xóa tất cả"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Key List Table / Cards */}
                {keyPool.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center text-xs text-slate-500 bg-slate-50/50">
                    Danh sách đang trống. Hãy dán API Key vào ô phía trên và nhấn <strong>Thêm vào danh sách</strong>.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white max-h-68 overflow-y-auto">
                    {keyPool.map((item, idx) => {
                      const isRevealed = Boolean(revealedKeys[item.id]);
                      const isTesting = Boolean(testingKeyIds[item.id]);
                      const isEditing = editingId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 py-3 transition-colors ${
                            item.isActive ? "bg-white hover:bg-slate-50/80" : "bg-slate-50/70 opacity-75"
                          }`}
                        >
                          {/* Left: Index + Label + Masked Key */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                item.isActive
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {idx + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editingLabel}
                                      onChange={(e) => setEditingLabel(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveLabel(item.id);
                                        if (e.key === "Escape") setEditingId(null);
                                      }}
                                      className="px-2 py-0.5 text-xs font-semibold border border-emerald-400 rounded bg-white text-slate-800 focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveLabel(item.id)}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                      title="Lưu tên"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold text-slate-800 truncate">
                                      {item.label}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditLabel(item)}
                                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                      title="Đổi tên gợi nhớ"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}

                                {renderStatusBadge(item.status)}
                              </div>

                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded select-all break-all">
                                  {isRevealed ? item.key : maskApiKey(item.key)}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => handleToggleReveal(item.id)}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                  title={isRevealed ? "Ẩn API Key" : "Hiện đầy đủ API Key"}
                                >
                                  {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Right: Toggle Switch + Quick Test + Delete */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            {/* Toggle Switch */}
                            <label
                              className="inline-flex items-center gap-1.5 cursor-pointer select-none"
                              title={item.isActive ? "Đang bật trong vòng xoay" : "Đang tắt tạm thời"}
                            >
                              <input
                                type="checkbox"
                                checked={item.isActive}
                                onChange={() => handleToggleActive(item.id)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all relative peer-checked:bg-emerald-600"></div>
                              <span className="text-xs font-medium text-slate-600 w-8">
                                {item.isActive ? "Bật" : "Tắt"}
                              </span>
                            </label>

                            {/* Quick Test single key */}
                            <button
                              type="button"
                              onClick={() => handleTestSingle(item)}
                              disabled={isTesting || isTestingAll}
                              title="Kiểm tra kết nối Key này"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-4 h-4 ${isTesting ? "animate-spin text-indigo-600" : ""}`} />
                            </button>

                            {/* Delete single key */}
                            <button
                              type="button"
                              onClick={() => handleRemoveSingleKey(item.id)}
                              title="Xóa Key này"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Mẹo sử dụng nhiều API Key miễn phí từ Google AI Studio:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                  <li>
                    Truy cập{" "}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline font-semibold"
                    >
                      aistudio.google.com/app/apikey
                    </a>{" "}
                    bằng 2–3 tài khoản Gmail khác nhau để tạo các mã <strong>API Key</strong> miễn phí.
                  </li>
                  <li>
                    Dán toàn bộ các mã Key vào ô bên trên (mỗi dòng 1 key) và bấm <strong>Thêm vào danh sách</strong>.
                  </li>
                  <li>
                    Hệ thống sẽ tự động chia tải xoay vòng (Round-Robin) và tự động nhảy sang Key dự phòng ngay lập tức nếu 1 Key bị chạm hạn mức 429.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: DANH MỤC MÔN HỌC */}
          {activeTab === "subjects" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                  Quản lý Môn học và Hoạt động giáo dục
                </h3>
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
                    <div
                      key={idx}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-sm"
                    >
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
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3">
          <div className="text-xs text-slate-500">
            {activeTab === "apikey" && (
              <span>
                Đang kích hoạt: <strong className="text-emerald-700">{activeCount}</strong> / {keyPool.length} Key
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            {activeTab === "apikey" && (
              <button
                onClick={handleSaveAndClose}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                {isSaved ? "Đã lưu!" : "Lưu cài đặt"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
