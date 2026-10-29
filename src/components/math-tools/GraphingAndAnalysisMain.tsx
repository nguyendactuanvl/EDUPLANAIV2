import React, { useState } from "react";
import { Grades6To9GeometryHub } from "./Grades6To9GeometryHub";
import { Grade10Graphing } from "./Grade10Graphing";
import { Grade11Graphing } from "./Grade11Graphing";
import { Grade12Graphing } from "./Grade12Graphing";
import { Compass, GraduationCap, Sparkles, BookOpen } from "lucide-react";

export const GraphingAndAnalysisMain: React.FC = () => {
  const [activeGrade, setActiveGrade] = useState<string>("thcs");

  return (
    <div className="flex flex-col gap-3 max-w-[95rem] mx-auto w-full p-2 sm:p-4">
      {/* Grade Level Selector Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800">
              Hỗ trợ Vẽ hình & Khảo sát hàm số (KSHS) • Lớp 6 đến Lớp 12
            </h2>
            <p className="text-[10px] text-slate-500">
              Mô phỏng hình học THCS (Lớp 6, 7, 8, 9) & Khảo sát hàm số THPT (Lớp 10, 11, 12)
            </p>
          </div>
        </div>

        {/* Grade Navigation pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveGrade("thcs")}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeGrade === "thcs"
                ? "bg-indigo-600 text-white font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>THCS (Lớp 6-9: Hình học & Đồ thị)</span>
          </button>
          <button
            onClick={() => setActiveGrade("grade10")}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeGrade === "grade10"
                ? "bg-indigo-600 text-white font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Lớp 10 (KSHS)</span>
          </button>
          <button
            onClick={() => setActiveGrade("grade11")}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeGrade === "grade11"
                ? "bg-purple-600 text-white font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Lớp 11 (KSHS)</span>
          </button>
          <button
            onClick={() => setActiveGrade("grade12")}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeGrade === "grade12"
                ? "bg-emerald-600 text-white font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Lớp 12 (KSHS)</span>
          </button>
        </div>
      </div>

      {/* Grade Content */}
      <div className="transition-all flex-1">
        {activeGrade === "thcs" && <Grades6To9GeometryHub />}
        {activeGrade === "grade10" && <Grade10Graphing />}
        {activeGrade === "grade11" && <Grade11Graphing />}
        {activeGrade === "grade12" && <Grade12Graphing />}
      </div>
    </div>
  );
};
