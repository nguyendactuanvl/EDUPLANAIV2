import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, SkipBack, ChevronLeft, ChevronRight, RotateCcw, 
  Sparkles, BookOpen, CheckCircle2 
} from 'lucide-react';
import { ConstructionStep } from '../types/geometry.types';
import { MathView } from '../../../components/MathView';

interface ConstructionTimelineProps {
  steps: ConstructionStep[];
  currentStepIndex: number;
  onStepChange: (stepIndex: number) => void;
}

export const ConstructionTimeline: React.FC<ConstructionTimelineProps> = ({
  steps,
  currentStepIndex,
  onStepChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play timeline timer
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        if (currentStepIndex < steps.length - 1) {
          onStepChange(currentStepIndex + 1);
        } else {
          setIsPlaying(false);
        }
      }, 3500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, currentStepIndex, steps.length, onStepChange]);

  const currentStep = steps[currentStepIndex] || steps[0];

  if (!steps || steps.length === 0) return null;

  return (
    <div className="bg-slate-900 border-t border-slate-800 text-white p-3 sm:p-4 shrink-0 shadow-lg z-20 space-y-3">
      
      {/* Step Progress Bar & Indicators */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-slate-300">
            Trình diễn dựng hình sư phạm: Bước {currentStepIndex + 1} / {steps.length}
          </span>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {steps.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setIsPlaying(false);
                onStepChange(idx);
              }}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                idx === currentStepIndex
                  ? 'w-7 bg-emerald-500 shadow-xs'
                  : idx < currentStepIndex
                  ? 'w-2.5 bg-emerald-800'
                  : 'w-2.5 bg-slate-700 hover:bg-slate-600'
              }`}
              title={`Chuyển sang ${s.title}`}
            />
          ))}
        </div>
      </div>

      {/* Main Controls & Step Commentary Card */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80">
        
        {/* Timeline Player Buttons */}
        <div className="flex items-center justify-center gap-2 shrink-0">
          
          {/* Rewind */}
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onStepChange(0);
            }}
            disabled={currentStepIndex === 0}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Tua về bước đầu tiên"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Previous Step */}
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              if (currentStepIndex > 0) onStepChange(currentStepIndex - 1);
            }}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl text-xs font-bold disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Trước</span>
          </button>

          {/* Play / Pause Toggle */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Tạm dừng</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Tự động phát</span>
              </>
            )}
          </button>

          {/* Next Step */}
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              if (currentStepIndex < steps.length - 1) onStepChange(currentStepIndex + 1);
            }}
            disabled={currentStepIndex === steps.length - 1}
            className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl text-xs font-bold disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">Tiếp theo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Step Commentary Text Box */}
        <div className="flex-1 bg-slate-900/90 p-2.5 px-4 rounded-xl border border-slate-700/60 min-w-0">
          <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{currentStep.title}</span>
          </h4>

          <div className="text-xs text-slate-300 leading-relaxed overflow-x-auto">
            <MathView value={currentStep.commentary} />
          </div>
        </div>

      </div>

    </div>
  );
};
