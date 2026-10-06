import React, { useState, useMemo } from 'react';
import { 
  X, Search, Play, Video, ExternalLink, Copy, Check, Sparkles, 
  Lightbulb, ChevronRight, ChevronLeft, BookOpen, Key, TrendingUp, 
  BarChart3, Calculator, BarChart2, FileCheck, Users, HelpCircle,
  PlayCircle, Youtube, CheckCircle2, Bookmark
} from 'lucide-react';
import { GUIDE_SECTIONS, GuideSection, getYoutubeEmbedUrl } from '../data/guideSections';
import { MathSpan } from './MarkdownRenderer';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSectionId?: string;
}

const ICON_MAP: Record<string, any> = {
  Key,
  TrendingUp,
  BarChart3,
  Calculator,
  BarChart2,
  FileCheck,
  Users,
  BookOpen
};

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  initialSectionId
}) => {
  const [selectedId, setSelectedId] = useState<string>(initialSectionId || GUIDE_SECTIONS[0].id);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [isPlayingInline, setIsPlayingInline] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Categories list
  const categories = useMemo(() => {
    return ['Tất cả', 'Cấu hình', 'Chuyên môn Toán', 'Kiểm tra & Thi', 'Công tác GV'];
  }, []);

  // Filtered sections
  const filteredSections = useMemo(() => {
    return GUIDE_SECTIONS.filter(section => {
      const matchCat = selectedCategory === 'Tất cả' || section.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        section.title.toLowerCase().includes(q) || 
        section.description.toLowerCase().includes(q) ||
        section.shortDesc.toLowerCase().includes(q) ||
        section.steps.some(s => s.title.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [searchQuery, selectedCategory]);

  // Current active section
  const currentSection = useMemo(() => {
    const found = GUIDE_SECTIONS.find(s => s.id === selectedId);
    return found || filteredSections[0] || GUIDE_SECTIONS[0];
  }, [selectedId, filteredSections]);

  const currentIndex = GUIDE_SECTIONS.findIndex(s => s.id === currentSection.id);

  if (!isOpen) return null;

  const handleCopyLink = async (url: string) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleSelectSection = (id: string) => {
    setSelectedId(id);
    setIsPlayingInline(false);
  };

  const handlePrevSection = () => {
    if (currentIndex > 0) {
      handleSelectSection(GUIDE_SECTIONS[currentIndex - 1].id);
    }
  };

  const handleNextSection = () => {
    if (currentIndex < GUIDE_SECTIONS.length - 1) {
      handleSelectSection(GUIDE_SECTIONS[currentIndex + 1].id);
    }
  };

  const embedUrl = getYoutubeEmbedUrl(currentSection.youtubeUrl);
  const hasVideo = Boolean(currentSection.youtubeUrl && currentSection.youtubeUrl.trim().length > 0);
  const IconComponent = ICON_MAP[currentSection.iconName] || BookOpen;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-6xl h-[92vh] max-h-[850px] flex flex-col overflow-hidden ring-1 ring-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* TOP MODAL HEADER */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/20">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Hướng Dẫn Sử Dụng EduPlan AI
                </h2>
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  GDPT 2018
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Hệ thống tài liệu & Video hướng dẫn từng bước trực quan cho Giáo viên
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Đóng cửa sổ hướng dẫn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS (Sidebar Navigation + Content Detail) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* LEFT COLUMN: LIST OF TOPICS */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/60 flex flex-col shrink-0">
            {/* Search Input */}
            <div className="p-3 sm:p-4 border-b border-slate-800/80 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm tính năng, bước làm..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List of sections */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 custom-scrollbar">
              {filteredSections.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Không tìm thấy mục hướng dẫn phù hợp
                </div>
              ) : (
                filteredSections.map((sec, idx) => {
                  const ItemIcon = ICON_MAP[sec.iconName] || BookOpen;
                  const isSelected = sec.id === currentSection.id;
                  const itemHasVideo = Boolean(sec.youtubeUrl && sec.youtubeUrl.trim().length > 0);

                  return (
                    <button
                      key={sec.id}
                      onClick={() => handleSelectSection(sec.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 border cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-950/40 to-slate-800 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                          : 'bg-slate-950/30 hover:bg-slate-800/60 border-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        <ItemIcon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isSelected 
                              ? 'bg-emerald-500/20 text-emerald-300' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {sec.badge}
                          </span>

                          {itemHasVideo ? (
                            <span className="flex items-center gap-1 text-[11px] text-rose-400 font-medium" title="Có video hướng dẫn">
                              <Youtube className="w-3.5 h-3.5 text-rose-500" />
                              <span className="hidden sm:inline">Video</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Bài đọc</span>
                          )}
                        </div>

                        <h4 className={`text-xs sm:text-sm font-semibold truncate ${
                          isSelected ? 'text-emerald-300' : 'text-slate-200'
                        }`}>
                          {sec.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {sec.shortDesc}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: DETAIL VIEW & YOUTUBE PLAYER */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-900/40 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header info */}
            <div className="border-b border-slate-800 pb-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <IconComponent className="w-3.5 h-3.5" />
                  {currentSection.category}
                </span>
                <span className="px-2 py-0.5 text-xs text-slate-400 bg-slate-800 rounded-md">
                  {currentSection.badge}
                </span>
              </div>

              <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                {currentSection.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                {currentSection.description}
              </p>
            </div>

            {/* VIDEO SECTION */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl shrink-0">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      Video Hướng Dẫn Thực Hành
                      {hasVideo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          HD 1080p
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {hasVideo ? "Xem thao tác trực tiếp trên màn hình từng bước" : "Video quay màn hình chi tiết sắp được cập nhật"}
                    </p>
                  </div>
                </div>

                {/* Actions when video is present */}
                {hasVideo && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setIsPlayingInline(prev => !prev)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isPlayingInline
                          ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isPlayingInline ? "Ẩn Video" : "Xem Video Trực Tiếp"}</span>
                    </button>

                    <button
                      onClick={() => handleCopyLink(currentSection.youtubeUrl)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Sao chép đường dẫn video YouTube"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Đã chép link!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Chép link</span>
                        </>
                      )}
                    </button>

                    <a
                      href={currentSection.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
                      title="Mở video trên tab YouTube mới"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>

              {/* Embedded Player or Video Placeholder */}
              {hasVideo ? (
                <div className="w-full">
                  {isPlayingInline && embedUrl ? (
                    <div className="w-full rounded-xl overflow-hidden bg-black border border-slate-700 shadow-2xl h-[240px] sm:h-[360px] lg:h-[420px] transition-all">
                      <iframe
                        src={embedUrl}
                        title={currentSection.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div 
                      onClick={() => setIsPlayingInline(true)}
                      className="group relative w-full h-44 sm:h-56 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-700/80 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-emerald-500/50 transition-all shadow-inner"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-rose-600/90 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 group-hover:scale-110 group-hover:bg-rose-500 transition-transform mb-3">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        Bấm để phát video hướng dẫn trong khung này
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-md">
                        Video minh họa trực tiếp các thao tác trên giao diện EduPlan AI
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-slate-950/50 border border-dashed border-slate-700/80 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Video className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-300">
                    Video hướng dẫn chi tiết đang được cập nhật (Sắp ra mắt)
                  </h4>
                  <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                    Thầy cô có thể đọc trước các bước thực hiện chi tiết ở phần bên dưới. Để gắn link video của riêng mình, hãy dán URL vào file <code className="px-1.5 py-0.5 bg-slate-800 text-emerald-400 rounded text-[11px] font-mono">src/data/guideSections.ts</code>.
                  </p>
                </div>
              )}
            </div>

            {/* STEP-BY-STEP INSTRUCTION CARDS */}
            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-emerald-400" />
                Các Bước Thực Hiện Chi Tiết
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {currentSection.steps.map((step, sIdx) => (
                  <div 
                    key={sIdx}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-500/30 shrink-0">
                        {sIdx + 1}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-emerald-300">
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 pl-8 leading-relaxed">
                      <MathSpan content={step.detail} />
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* TIPS & BEST PRACTICES */}
            {currentSection.tips && currentSection.tips.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-800/40 to-teal-950/30 border border-emerald-500/30 space-y-2">
                <h4 className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                  Mẹo & Lưu Ý Dành Cho Thầy Cô
                </h4>
                <ul className="space-y-1.5 pl-6 list-disc text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {currentSection.tips.map((tip, tIdx) => (
                    <li key={tIdx}>
                      <MathSpan content={tip} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* BOTTOM NAVIGATION (PREV / NEXT) */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={handlePrevSection}
                disabled={currentIndex === 0}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentIndex === 0
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Mục trước</span>
              </button>

              <div className="text-xs text-slate-500 font-mono">
                {currentIndex + 1} / {GUIDE_SECTIONS.length}
              </div>

              <button
                onClick={handleNextSection}
                disabled={currentIndex === GUIDE_SECTIONS.length - 1}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentIndex === GUIDE_SECTIONS.length - 1
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                }`}
              >
                <span>Mục tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
