import React, { useState } from "react";
import { Grade9Graphing } from "./Grade9Graphing";
import { Grade10Graphing } from "./Grade10Graphing";
import { Grade11Graphing } from "./Grade11Graphing";
import { Grade12Graphing } from "./Grade12Graphing";
import { GradeLevel } from "./types";
import { Compass, GraduationCap, Sparkles, BookOpen } from "lucide-react";

export const GraphingAndAnalysisMain: React.FC = () => {
  const [activeGrade, setActiveGrade] = useState<GradeLevel>("grade12");

  return (
    <div className="flex flex-col gap-3 max-w-[95rem] mx-auto w-full p-2 sm:p-4">
      {/* Grade Level Selector Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800">
              Công cụ Hỗ trợ Vẽ hình & Khảo sát hàm số (KSHS)
            </h2>
            <p className="text-[10px] text-slate-500">
              Chương trình chuẩn Toán từ Lớp 9 đến Lớp 12
            </p>
          </div>
        </div>

        {/* Grade Navigation pills */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold gap-0.5">
          <button
            onClick={() => setActiveGrade("grade9")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              activeGrade === "grade9"
                ? "bg-white text-blue-700 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Lớp 9</span>
          </button>
          <button
            onClick={() => setActiveGrade("grade10")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              activeGrade === "grade10"
                ? "bg-white text-indigo-700 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Lớp 10</span>
          </button>
          <button
            onClick={() => setActiveGrade("grade11")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              activeGrade === "grade11"
                ? "bg-white text-purple-700 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Lớp 11</span>
          </button>
          <button
            onClick={() => setActiveGrade("grade12")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              activeGrade === "grade12"
                ? "bg-white text-emerald-700 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Lớp 12</span>
          </button>
        </div>
      </div>

      {/* Grade Content */}
      <div className="transition-all flex-1">
        {activeGrade === "grade9" && <Grade9Graphing />}
        {activeGrade === "grade10" && <Grade10Graphing />}
        {activeGrade === "grade11" && <Grade11Graphing />}
        {activeGrade === "grade12" && <Grade12Graphing />}
      </div>
    </div>
  );
};
