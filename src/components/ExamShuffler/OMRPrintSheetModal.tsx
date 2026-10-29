import React, { useRef } from 'react';
import { Printer, X, Info } from 'lucide-react';

interface OMRPrintSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OMRPrintSheetModal: React.FC<OMRPrintSheetModalProps> = ({ isOpen, onClose }) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* CSS Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #omr-printable-sheet, #omr-printable-sheet * {
            visibility: visible !important;
          }
          #omr-printable-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 8mm !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[96vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Phiếu Trả Lời Trắc Nghiệm Chuẩn Bộ GD&ĐT (Mẫu mới 2025 - 2028)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chuẩn định dạng A4, 4 góc đen định vị, SBD 6 số, Mã đề 4 số, P.I 40 câu, P.II 8 câu (Đ/S), P.III 6 câu trả lời ngắn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In phiếu ngay (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-950/50 px-6 py-2.5 border-b border-blue-100 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-blue-500" />
            <span>
              <b>Lưu ý khi in:</b> Trong hộp thoại In trình duyệt, chọn Khổ giấy <b>A4</b>, Tỉ lệ <b>100%</b> (Fit to printable area) và bật <b>In đồ họa nền (Background graphics)</b>.
            </span>
          </div>
        </div>

        {/* Printable A4 Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            ref={printAreaRef}
            id="omr-printable-sheet"
            className="w-[210mm] min-h-[297mm] bg-white text-black p-[8mm] shadow-xl relative font-sans text-xs select-none border border-slate-300"
            style={{ boxSizing: 'border-box' }}
          >
            {/* 4 Outer Corner Alignment Squares */}
            <div className="absolute top-[5mm] left-[5mm] w-[8mm] h-[8mm] bg-black" />
            <div className="absolute top-[5mm] right-[5mm] w-[8mm] h-[8mm] bg-black" />
            <div className="absolute bottom-[5mm] left-[5mm] w-[8mm] h-[8mm] bg-black" />
            <div className="absolute bottom-[5mm] right-[5mm] w-[8mm] h-[8mm] bg-black" />

            {/* Edge Alignment Squares along margins */}
            <div className="absolute top-[5mm] left-[50%] -translate-x-1/2 w-[6mm] h-[6mm] bg-black" />
            <div className="absolute bottom-[5mm] left-[50%] -translate-x-1/2 w-[6mm] h-[6mm] bg-black" />
            <div className="absolute left-[5mm] top-[40%] w-[6mm] h-[6mm] bg-black" />
            <div className="absolute right-[5mm] top-[40%] w-[6mm] h-[6mm] bg-black" />

            {/* Title & Subtitle */}
            <div className="text-center mb-2 pt-1">
              <h1 className="text-base font-black tracking-widest uppercase text-black">
                PHIẾU TRẢ LỜI TRẮC NGHIỆM
              </h1>
              <div className="text-[11px] font-medium text-slate-900 mt-0.5">
                Kỳ thi ....................................................................................................
              </div>
              <div className="text-[11px] font-medium text-slate-900 flex justify-between px-4 mt-0.5">
                <span>Bài thi: ....................................................................</span>
                <span>Ngày thi: ........ / ........ / 20.......</span>
              </div>
            </div>

            {/* Top Table Grid: Điểm/Giám thị, Thí sinh info, SBD & Mã đề */}
            <div className="grid grid-cols-12 border border-black text-[10px] leading-tight mb-2 bg-white">
              {/* Box 1 (Cols 1-3): Điểm & Giám thị */}
              <div className="col-span-3 border-r border-black flex flex-col justify-between p-1 space-y-1">
                <div className="border border-black p-1 h-16 flex flex-col justify-between">
                  <span className="font-bold text-[10px]">Điểm</span>
                </div>
                <div className="border border-black p-1 text-[9px] text-center min-h-[38px] flex items-center justify-center font-medium leading-tight">
                  Họ tên, chữ ký<br />của cán bộ coi thi 1
                </div>
                <div className="border border-black p-1 text-[9px] text-center min-h-[38px] flex items-center justify-center font-medium leading-tight">
                  Họ tên, chữ ký<br />của cán bộ coi thi 2
                </div>
              </div>

              {/* Box 2 (Cols 4-7): Thí sinh info */}
              <div className="col-span-5 border-r border-black p-1.5 space-y-1.5 text-[10px] flex flex-col justify-between">
                <div>1. Hội đồng thi: ..........................................................</div>
                <div>2. Điểm thi: ..................................................................</div>
                <div>3. Phòng thi số: ..............................................................</div>
                <div>4. Họ và tên thí sinh: ....................................................</div>
                <div>5. Ngày sinh: ......./......./............... (Nam/ Nữ).</div>
                <div>6. Chữ ký của thí sinh: ...................................................</div>
              </div>

              {/* Box 3 (Cols 8-12): SBD & Mã đề */}
              <div className="col-span-4 p-1 flex justify-around relative">
                {/* Black side anchor squares */}
                <div className="absolute right-[-4px] top-[45%] w-[6px] h-[6px] bg-black" />
                <div className="absolute right-[-4px] bottom-[8%] w-[6px] h-[6px] bg-black" />

                {/* 7. Số báo danh (6 columns) */}
                <div className="flex flex-col items-center">
                  <span className="font-bold text-[9px] mb-0.5">7. Số báo danh</span>
                  <div className="grid grid-cols-6 border border-black w-24 text-center h-4 font-bold text-[9px] bg-slate-50 mb-0.5">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="border-r last:border-r-0 border-black h-full"></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-[1px]">
                    {[0, 1, 2, 3, 4, 5].map((col) => (
                      <div key={col} className="flex flex-col gap-[1px]">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                          <span
                            key={digit}
                            className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[8px] font-semibold text-slate-900"
                          >
                            {digit}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 8. Mã đề thi (4 columns) */}
                <div className="flex flex-col items-center">
                  <span className="font-bold text-[9px] mb-0.5">8. Mã đề thi</span>
                  <div className="grid grid-cols-4 border border-black w-16 text-center h-4 font-bold text-[9px] bg-slate-50 mb-0.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="border-r last:border-r-0 border-black h-full"></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-[1px]">
                    {[0, 1, 2, 3].map((col) => (
                      <div key={col} className="flex flex-col gap-[1px]">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                          <span
                            key={digit}
                            className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[8px] font-semibold text-slate-900"
                          >
                            {digit}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* PHẦN I: Trắc nghiệm 4 lựa chọn (40 câu) */}
            <div className="border border-black bg-slate-100/60 p-1 relative mb-2">
              {/* Anchor Black Squares at column borders */}
              <div className="absolute top-[-3px] left-[25%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute top-[-3px] left-[50%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute top-[-3px] left-[75%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute bottom-[-3px] left-[25%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute bottom-[-3px] left-[50%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute bottom-[-3px] left-[75%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />

              <div className="font-bold text-[11px] mb-0.5 text-black">PHẦN I</div>

              <div className="grid grid-cols-4 gap-1.5 bg-white border border-slate-300 p-1">
                {[
                  { start: 1, end: 10 },
                  { start: 11, end: 20 },
                  { start: 21, end: 30 },
                  { start: 31, end: 40 },
                ].map((colGroup, colIdx) => (
                  <div key={colIdx} className="space-y-[1px] border-r last:border-r-0 border-slate-200 pr-1">
                    {/* Column Header A B C D */}
                    <div className="flex justify-end gap-1.5 pr-0.5 text-[9px] font-bold text-slate-700 border-b border-slate-200 pb-0.5 mb-0.5">
                      <span className="w-3.5 text-center">A</span>
                      <span className="w-3.5 text-center">B</span>
                      <span className="w-3.5 text-center">C</span>
                      <span className="w-3.5 text-center">D</span>
                    </div>

                    {Array.from({ length: colGroup.end - colGroup.start + 1 }, (_, i) => colGroup.start + i).map((qNum) => (
                      <div key={qNum} className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-900 w-5">{qNum}</span>
                        <div className="flex gap-1.5">
                          {['A', 'B', 'C', 'D'].map((opt) => (
                            <span
                              key={opt}
                              className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[7px]"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* PHẦN II: Trắc nghiệm Đúng / Sai (8 câu) */}
            <div className="border border-black bg-slate-100/60 p-1 relative mb-2">
              {/* Anchor Black Squares at pair borders */}
              <div className="absolute top-[-3px] left-[25%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute top-[-3px] left-[50%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute top-[-3px] left-[75%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute bottom-[-3px] left-[25%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute bottom-[-3px] left-[50%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute bottom-[-3px] left-[75%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />

              <div className="font-bold text-[11px] mb-0.5 text-black">PHẦN II</div>

              <div className="grid grid-cols-4 gap-1.5 bg-white border border-slate-300 p-1">
                {[
                  [1, 2],
                  [3, 4],
                  [5, 6],
                  [7, 8],
                ].map((pair, pIdx) => (
                  <div key={pIdx} className="grid grid-cols-2 gap-1 border-r last:border-r-0 border-slate-200 pr-1">
                    {pair.map((qNum) => (
                      <div key={qNum} className="space-y-[1px]">
                        <div className="font-bold text-[10px] text-center border-b border-slate-300 pb-0.5">
                          Câu {qNum}
                        </div>
                        <div className="flex justify-end gap-1.5 pr-0.5 text-[8px] font-bold text-slate-800">
                          <span className="w-3.5 text-center">Đúng</span>
                          <span className="w-3.5 text-center">Sai</span>
                        </div>
                        {['a', 'b', 'c', 'd'].map((stmt) => (
                          <div key={stmt} className="flex items-center justify-between text-[9px]">
                            <span className="font-medium text-slate-800">{stmt})</span>
                            <div className="flex gap-1.5">
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[7px]" />
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[7px]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* PHẦN III: Trắc nghiệm Trả lời ngắn (6 câu) */}
            <div className="border border-black bg-slate-100/60 p-1 relative">
              {/* Anchor Black Squares */}
              <div className="absolute top-[-3px] left-[16.6%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute top-[-3px] left-[33.3%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute top-[-3px] left-[50%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute top-[-3px] left-[66.6%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute top-[-3px] left-[83.3%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute bottom-[-3px] left-[16.6%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute bottom-[-3px] left-[33.3%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute bottom-[-3px] left-[50%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute bottom-[-3px] left-[66.6%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />
              <div className="absolute bottom-[-3px] left-[83.3%] -translate-x-1/2 w-[6px] h-[6px] bg-black" />

              <div className="font-bold text-[11px] mb-0.5 text-black">PHẦN III</div>

              <div className="grid grid-cols-6 gap-1 bg-white border border-slate-300 p-1">
                {[1, 2, 3, 4, 5, 6].map((qNum) => (
                  <div key={qNum} className="border border-slate-200 p-0.5 flex flex-col items-center space-y-1">
                    <div className="font-bold text-[10px] text-center border-b border-slate-200 pb-0.5 w-full">
                      Câu {qNum}
                    </div>

                    {/* Top write-in box line */}
                    <div className="grid grid-cols-4 border border-black w-full h-4 text-center font-mono text-[9px] bg-slate-50">
                      <div className="border-r border-black" />
                      <div className="border-r border-black" />
                      <div className="border-r border-black" />
                      <div />
                    </div>

                    {/* Bubble columns */}
                    <div className="grid grid-cols-4 gap-[2px] w-full pt-0.5">
                      {/* Column 1: '-' bubble */}
                      <div className="flex flex-col items-center gap-[1px]">
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[8px] font-bold bg-slate-100">
                          -
                        </span>
                        <div className="w-3.5 h-3.5" />
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                          <span
                            key={digit}
                            className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[8px] font-semibold text-slate-900"
                          >
                            {digit}
                          </span>
                        ))}
                      </div>

                      {/* Column 2: ',' bubble */}
                      <div className="flex flex-col items-center gap-[1px]">
                        <div className="w-3.5 h-3.5" />
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[8px] font-bold bg-slate-100">
                          ,
                        </span>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                          <span
                            key={digit}
                            className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[8px] font-semibold text-slate-900"
                          >
                            {digit}
                          </span>
                        ))}
                      </div>

                      {/* Column 3: ',' bubble on row 2 + Digits */}
                      <div className="flex flex-col items-center gap-[1px]">
                        <div className="w-3.5 h-3.5" />
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[8px] font-bold bg-slate-100">
                          ,
                        </span>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                          <span
                            key={digit}
                            className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[8px] font-semibold text-slate-900"
                          >
                            {digit}
                          </span>
                        ))}
                      </div>

                      {/* Column 4: Digits only */}
                      <div className="flex flex-col items-center gap-[1px]">
                        <div className="w-3.5 h-3.5" />
                        <div className="w-3.5 h-3.5" />
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                          <span
                            key={digit}
                            className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[8px] font-semibold text-slate-900"
                          >
                            {digit}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Khuyến nghị: In trên máy in Laser trắng đen chuẩn khổ A4, giấy định lượng 70 - 80 gsm để camera đọc nhạy nhất.
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In phiếu A4</span>
          </button>
        </div>
      </div>
    </div>
  );
};
