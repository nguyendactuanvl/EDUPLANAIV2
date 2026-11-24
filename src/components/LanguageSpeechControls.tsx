import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Square, SkipForward, SkipBack, Globe, Loader2, FastForward, Check, Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';
import { convertMathToSpeech } from '../lib/mathSpeech';

interface LanguageSpeechControlsProps {
  content: string; // Current content (Markdown or text)
  questions?: any[]; // Optional structured questions array
  onContentChange?: (translatedContent: string, newLang: 'vi' | 'en') => void;
  onQuestionsChange?: (translatedQuestions: any[], newLang: 'vi' | 'en') => void;
  subject?: string;
  className?: string;
  compact?: boolean;
}


export const LanguageSpeechControls: React.FC<LanguageSpeechControlsProps> = React.memo(({
  content,
  questions,
  onContentChange,
  onQuestionsChange,
  subject = 'Toán',
  className = '',
  compact = false
}) => {
  const [currentLang, setCurrentLang] = useState<'vi' | 'en'>('vi');
  const [isTranslating, setIsTranslating] = useState(false);
  const [originalContentCache, setOriginalContentCache] = useState<Record<string, string>>({});
  const [questionsCache, setQuestionsCache] = useState<Record<string, any[]>>({});
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Audio Reader state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [showAudioBar, setShowAudioBar] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load browser SpeechSynthesis voices safely without infinite event loops
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    let isMounted = true;

    const updateVoices = () => {
      if (!isMounted) return;
      try {
        const voices = window.speechSynthesis.getVoices() || [];
        if (voices.length === 0) return;

        setAvailableVoices(prev => {
          if (prev.length === voices.length && prev[0]?.name === voices[0]?.name) {
            return prev;
          }
          return voices;
        });

        const targetLangPrefix = currentLang === 'en' ? 'en' : 'vi';
        const bestVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetLangPrefix)) || voices[0] || null;

        setSelectedVoice(prev => {
          if (prev?.name === bestVoice?.name) return prev;
          return bestVoice;
        });
      } catch (e) {
        console.warn("Voices loading warning:", e);
      }
    };

    updateVoices();

    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    }

    return () => {
      isMounted = false;
      if ('onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
      }
    };
  }, [currentLang]);

  // Clean up speech on unmount only
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const extractResponseError = async (res: Response): Promise<string> => {
    try {
      const raw = await res.text();
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.error === 'string' && parsed.error.trim()) return parsed.error.trim();
          if (typeof parsed?.message === 'string' && parsed.message.trim()) return parsed.message.trim();
        } catch {
          if (!raw.trim().startsWith('<')) return raw.trim();
        }
      }
    } catch {}
    return `Không thể chuyển ngữ chuyên ngành (HTTP ${res.status}). Vui lòng thử lại sau.`;
  };

  // Handle Translate button
  const handleToggleLanguage = async () => {
    setNoticeMessage(null);
    const targetLang = currentLang === 'vi' ? 'en' : 'vi';
    const hasQuestions = Boolean(questions && Array.isArray(questions) && questions.length > 0);
    const hasText = Boolean(content && content.trim().length > 0);

    if (!hasQuestions && !hasText) {
      setNoticeMessage('Chưa có nội dung để chuyển ngữ.');
      return;
    }

    // Check if we have cached translation
    if (questionsCache[targetLang] && onQuestionsChange) {
      setCurrentLang(targetLang);
      onQuestionsChange(questionsCache[targetLang], targetLang);
      if (originalContentCache[targetLang] && onContentChange) {
        onContentChange(originalContentCache[targetLang], targetLang);
      }
      return;
    }

    if (originalContentCache[targetLang] && !hasQuestions) {
      setCurrentLang(targetLang);
      if (onContentChange) {
        onContentChange(originalContentCache[targetLang], targetLang);
      }
      return;
    }

    setIsTranslating(true);
    try {
      if (hasQuestions && questions) {
        setQuestionsCache(prev => ({ ...prev, [currentLang]: questions }));
        if (hasText) setOriginalContentCache(prev => ({ ...prev, [currentLang]: content }));

        const res = await apiFetch('/api/translate-academic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions,
            text: hasText ? content : undefined,
            targetLang,
            subject
          })
        });

        if (!res.ok) {
          throw new Error(await extractResponseError(res));
        }
        const data = await res.json();

        let applied = false;
        if (data.translatedQuestions && Array.isArray(data.translatedQuestions) && data.translatedQuestions.length > 0) {
          setQuestionsCache(prev => ({ ...prev, [targetLang]: data.translatedQuestions }));
          if (onQuestionsChange) {
            onQuestionsChange(data.translatedQuestions, targetLang);
          }
          applied = true;
        }
        if (data.translatedText) {
          setOriginalContentCache(prev => ({ ...prev, [targetLang]: data.translatedText }));
          if (onContentChange) {
            onContentChange(data.translatedText, targetLang);
          }
          applied = true;
        }
        if (applied) {
          setCurrentLang(targetLang);
        } else {
          throw new Error('Phản hồi chuyển ngữ không có dữ liệu câu hỏi. Vui lòng thử lại.');
        }
      } else {
        setOriginalContentCache(prev => ({ ...prev, [currentLang]: content }));

        const res = await apiFetch('/api/translate-academic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: content,
            targetLang,
            subject
          })
        });

        if (!res.ok) {
          throw new Error(await extractResponseError(res));
        }

        const data = await res.json();
        const translated = data.translatedText || content;

        setOriginalContentCache(prev => ({ ...prev, [targetLang]: translated }));
        setCurrentLang(targetLang);
        if (onContentChange) {
          onContentChange(translated, targetLang);
        }
      }
    } catch (e: any) {
      console.warn('Translation notice:', e);
      setNoticeMessage(e?.message || 'Không thể chuyển ngữ chuyên ngành. Vui lòng thử lại sau.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Speech controls
  const handlePlaySpeech = () => {
    setNoticeMessage(null);
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setNoticeMessage('Trình duyệt của bạn không hỗ trợ tính năng Đọc thành tiếng (Speech Synthesis).');
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    // Convert Math formulas to spoken language
    const spokenText = convertMathToSpeech(content, currentLang);
    if (!spokenText) {
      setNoticeMessage('Không có nội dung văn bản để đọc.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = speechRate;
    utterance.lang = currentLang === 'en' ? 'en-US' : 'vi-VN';

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
    setShowAudioBar(true);
  };

  const handlePauseSpeech = () => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStopSpeech = () => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleChangeRate = (rate: number) => {
    setSpeechRate(rate);
    if (isPlaying || isPaused) {
      handleStopSpeech();
      setTimeout(() => handlePlaySpeech(), 100);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* 1. Nút chuyển đổi Tiếng Việt / Tiếng Anh chuyên ngành */}
      <button
        type="button"
        onClick={handleToggleLanguage}
        disabled={isTranslating}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm ${
          currentLang === 'en'
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-300'
            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
        }`}
        title="Chuyển đổi Tiếng Việt và Tiếng Anh chuyên ngành chuẩn môn học"
      >
        {isTranslating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-200" />
            <span>Đang dịch {subject}...</span>
          </>
        ) : (
          <>
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>{currentLang === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English (Academic)'}</span>
            <span className="text-[10px] opacity-75 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-1 rounded">
              {currentLang === 'vi' ? 'Đổi sang EN' : 'Đổi sang VI'}
            </span>
          </>
        )}
      </button>

      {/* 2. Nút đọc chuyên nghiệp (Text-to-Speech) */}
      <button
        type="button"
        onClick={() => {
          setShowAudioBar(!showAudioBar);
          if (!isPlaying && !isPaused) {
            handlePlaySpeech();
          }
        }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm ${
          isPlaying || showAudioBar
            ? 'bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-200'
            : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
        }`}
        title="Đọc chuyên nghiệp với phát âm công thức Toán & Khoa học"
      >
        <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-bounce' : ''}`} />
        <span>🔊 Đọc chuyên nghiệp</span>
      </button>

      {/* Floating Audio Control Bar */}
      {showAudioBar && (
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 p-2 bg-amber-900 text-amber-50 rounded-xl shadow-lg border border-amber-700 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-1">
            {isPlaying ? (
              <button
                onClick={handlePauseSpeech}
                className="p-1.5 rounded-lg bg-amber-800 hover:bg-amber-700 text-amber-100"
                title="Tạm dừng"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handlePlaySpeech}
                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                title="Phát tiếng"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}

            <button
              onClick={handleStopSpeech}
              className="p-1.5 rounded-lg bg-amber-800 hover:bg-amber-700 text-amber-200"
              title="Dừng đọc"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Speed Rate selector */}
          <div className="flex items-center gap-1 bg-amber-950/60 px-2 py-1 rounded-lg">
            <FastForward className="w-3 h-3 text-amber-300" />
            <span className="text-[10px] text-amber-300">Tốc độ:</span>
            {[0.8, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => handleChangeRate(rate)}
                className={`px-1.5 py-0.5 text-[10px] rounded font-mono ${
                  speechRate === rate ? 'bg-amber-500 text-amber-950 font-bold' : 'hover:bg-amber-800 text-amber-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Voice selector */}
          {availableVoices.length > 0 && (
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const v = availableVoices.find(voice => voice.name === e.target.value) || null;
                setSelectedVoice(v);
                if (isPlaying) {
                  handleStopSpeech();
                  setTimeout(() => handlePlaySpeech(), 100);
                }
              }}
              className="bg-amber-950 border border-amber-700 text-amber-100 text-[11px] rounded-lg px-2 py-1 max-w-[140px] truncate"
            >
              {availableVoices
                .filter(v => v.lang.startsWith(currentLang === 'en' ? 'en' : 'vi') || v.lang.startsWith('vi') || v.lang.startsWith('en'))
                .map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
            </select>
          )}

          <button
            onClick={() => {
              handleStopSpeech();
              setShowAudioBar(false);
            }}
            className="ml-auto text-amber-400 hover:text-amber-200 p-1"
            title="Đóng thanh điều khiển đọc"
          >
            ✕
          </button>
        </div>
      )}

      {noticeMessage && (
        <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <span>{noticeMessage}</span>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-rose-500 hover:text-rose-700 font-bold px-1"
            title="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
});
