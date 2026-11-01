import { 
  Trophy, BookOpen, Calendar, FileText, Settings, Sparkles, Clock, 
  ClipboardList, FileEdit, FileCheck, Users, ShieldCheck, 
  Key, Calculator, HelpCircle, PlayCircle, PenTool, ScanLine, Sun, Moon, GraduationCap, BarChart3,
  Dna, Zap, Lock, Shuffle, PieChart, FlaskConical, Languages, Box
} from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings?: (defaultTab?: "apikey" | "subjects") => void;
  onOpenGuide?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export function Sidebar({ 
  activeTab, 
  setActiveTab, 
  onOpenSettings, 
  onOpenGuide,
  isDarkMode = false,
  onToggleTheme
}: SidebarProps) {
  const navGroups = [
    {
      title: "Chuyên môn & Soạn giảng",
      items: [
        { id: "worksheets", label: "1. Phiếu học tập", icon: ClipboardList },
        { id: "exercise", label: "2. Giải bài tập", icon: Sparkles },
        { id: "pdf2word", label: "3. Chuyển PDF sang Word", icon: FileEdit },
        { id: "exam_shuffler", label: "4. Khảo thí & Chấm OMR", icon: Shuffle },
        { id: "exam", label: "5. Tạo & Trộn đề (Ma trận)", icon: FileCheck },
        { id: "de_online_pdf", label: "6. Đề online từ PDF của GV", icon: FileText },
        { id: "khgd", label: "7. Kế hoạch giáo dục", icon: Calendar },
        { id: "khdh", label: "8. Kế hoạch dạy học", icon: BookOpen },
        { id: "graduation_review", label: "8b. Ôn TN THPT 12 (CV 5512)", icon: GraduationCap },
        { id: "math_tools", label: "9. Công cụ Toán học", icon: Calculator },
        { id: "spatial_geometry", label: "10. Hình học Không gian (3D)", icon: Box },
      ]
    },
    {
      title: "Bộ môn THPT (GDPT 2018)",
      items: [
        { id: "physics", label: "Vật lý (Physics Toolkit)", icon: Zap },
        { id: "chemistry", label: "Hóa học (Chemistry Toolkit)", icon: FlaskConical },
        { id: "english", label: "Tiếng Anh (English Toolkit)", icon: Languages },
        { id: "biology", label: "Sinh học (Biology Toolkit)", icon: Dna },
      ]
    },
    {
      title: "Khảo thí & Tiện ích Nâng cao",
      items: [
        { id: "hsa_tsa", label: "Ôn thi HSA & TSA (ĐGNL)", icon: GraduationCap },
        { id: "ai_studio", label: "AI Studio & Sáng tạo", icon: Sparkles },
        { id: "math_ocr", label: "Math OCR & LaTeX (Word)", icon: ScanLine },
        { id: "ink", label: "EduPlan AI Ink (Bảng vẽ)", icon: PenTool },
        { id: "exam_stats", label: "Dashboard Thống kê thi", icon: BarChart3 },
        { id: "overall_dashboard", label: "Dashboard Tổng quan", icon: PieChart },
        { id: "user_guide", label: "Hướng dẫn sử dụng", icon: HelpCircle, isAction: true },
      ]
    },
    {
      title: "Nghiệp vụ & Hồ sơ",
      items: [
        { id: "homeroom", label: "Sổ Chủ Nhiệm & QL", icon: ShieldCheck },
        { id: "classmap", label: "Sơ đồ lớp", icon: Users },
        { id: "gamification", label: "Thi đua & Gọi tên", icon: Trophy },
        { id: "circulars", label: "Tài liệu & Thông tư", icon: FileText },
        { id: "history", label: "Lịch sử đã tạo", icon: Clock },
      ]
    }
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-full flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3 text-emerald-400">
          <Sparkles className="h-8 w-8" />
          <h1 className="text-xl font-bold">EduPlan AI</h1>
        </div>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Ứng dụng đa năng cho GV
        </p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-6 last:mb-2">
            <h3 className="px-6 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        if (item.id === "user_guide") {
                          onOpenGuide?.();
                        } else {
                          setActiveTab(item.id);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors cursor-pointer",
                        item.id === "user_guide"
                          ? "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                          : isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-r-4 border-emerald-500"
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", item.id === "user_guide" && "text-emerald-400")} />
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-3">
        {/* Dark/Light Mode Switch Button */}
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/70 transition-all cursor-pointer group"
          title="Chuyển đổi giao diện Ban đêm (Tối) / Ban ngày (Sáng)"
        >
          <div className="flex items-center gap-2.5">
            {isDarkMode ? (
              <Moon className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
            )}
            <span className="text-xs font-semibold">
              {isDarkMode ? "Tối" : "Sáng"}
            </span>
          </div>

          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${isDarkMode ? 'bg-indigo-600 justify-end' : 'bg-slate-600 justify-start'}`}>
            <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
          </div>
        </button>
      </div>
    </div>
  );
}

