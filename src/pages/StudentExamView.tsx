import { MathView } from "../components/MathView";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, FileText, Trophy, CheckCircle2, XCircle, Clock, Copy, Camera, X, Image as ImageIcon, Calculator, BarChart3, RefreshCw, Download, ExternalLink, Eye, UserCheck, Award, Search, ShieldAlert, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { ScientificCalculatorModal } from '../components/math-tools/ScientificCalculatorModal';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { apiFetch } from '../lib/apiFetch';
import LZString from 'lz-string';
import { XLSX } from '../lib/xlsxUtils';
import { fixMath, cleanMath, cleanQuestionStem, cleanOptionText, formatMathContent, sanitizeShortAnswerInput, validateShortAnswer, compareShortAnswers, sanitizeAndPolishMath, sanitizeExamQuestion } from "../lib/utils";
import { fetchExamFromCloud, saveExamToCloud, SYSTEM_EXAM_WEBHOOK } from "../lib/cloudExamStore";
import { LanguageSpeechControls } from "../components/LanguageSpeechControls";

const EMPTY_ESSAY_IMAGES: string[] = [];

interface StudentQuestionCardProps {
  idx: number;
  q: any;
  examLanguage: 'vi' | 'en';
  isSubmitted: boolean;
  answer: any;
  onAnswerChange: (idx: number, ans: any) => void;
  essayImages: string[];
  onImageUpload: (idx: number, files: FileList | null) => void;
  onRemoveEssayImage: (idx: number, imgIdx: number) => void;
  onPreviewImage: (url: string) => void;
}

const StudentQuestionCard = React.memo<StudentQuestionCardProps>(({
  idx,
  q,
  examLanguage,
  isSubmitted,
  answer,
  onAnswerChange,
  essayImages,
  onImageUpload,
  onRemoveEssayImage,
  onPreviewImage
}) => {
  let isCorrectQuestion = false;
  let showRedBorder = false;

  if (isSubmitted) {
    const ans = answer;
    const qType = String(q.type || '').toUpperCase();
    if (q.type === 'mc' || qType === 'MULTIPLE_CHOICE' || (!q.type && q.options)) {
      isCorrectQuestion = ans === q.correctOptionIndex;
      showRedBorder = !isCorrectQuestion;
    } else if (q.type === 'tf' || qType === 'TRUE_FALSE') {
      if (q.tfStatements && q.tfStatements.length > 0) {
        let correctCount = 0;
        q.tfStatements.forEach((stmt: any, sIdx: number) => {
          const studentAns = ans ? ans[sIdx] : undefined;
          const isTrue = stmt.correct === true || String(stmt.correct).toLowerCase() === 'true';
          if (studentAns === isTrue) correctCount++;
        });
        isCorrectQuestion = correctCount === q.tfStatements.length;
        showRedBorder = correctCount < q.tfStatements.length;
      } else {
        const isTrue = q.correct === true || String(q.correct).toLowerCase() === 'true' || String(q.correctAnswer).toLowerCase().includes('đúng');
        isCorrectQuestion = ans === isTrue;
        showRedBorder = !isCorrectQuestion;
      }
    } else if (q.type === 'sa' || qType === 'SHORT_ANSWER') {
      const correctAns = String(q.correctAnswer || q.correct || '').trim();
      const studentAns = String(ans || '').trim();
      isCorrectQuestion = !!(correctAns && compareShortAnswers(studentAns, correctAns));
      showRedBorder = !isCorrectQuestion;
    } else {
      showRedBorder = false;
      isCorrectQuestion = true;
    }
  }

  const qType = String(q.type || '').toUpperCase();
  const isMC = q.type === 'mc' || qType === 'MULTIPLE_CHOICE' || (!q.type && q.options);
  const isTF = q.type === 'tf' || qType === 'TRUE_FALSE';
  const isSA = q.type === 'sa' || qType === 'SHORT_ANSWER';
  const isEssay = q.type === 'essay' || qType === 'ESSAY';

  const questionContent = useMemo(() => {
    const rawStem = (q.question && String(q.question).trim())
      ? String(q.question).trim()
      : (q.content && String(q.content).trim())
      ? String(q.content).trim()
      : (q.text || '');

    const stemWithoutOptions = (isMC || isTF)
      ? (cleanQuestionStem(rawStem, q.options, q.tfStatements) || rawStem)
      : rawStem;

    const trimmedStem = stemWithoutOptions.replace(/^(?:Câu|Bài|Question)\s*\d+[\s\.\:\-–—\(\)\[\]A-Za-zÀ-ỹ]*[:\.]\s*/i, '').trim();
    const rawStemContent = trimmedStem || stemWithoutOptions || q.question || q.content || '';
    return sanitizeExamQuestion(rawStemContent);
  }, [q.question, q.content, q.text, q.options, q.tfStatements, isMC, isTF]);

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border ${isSubmitted && showRedBorder ? 'border-red-200' : isSubmitted ? 'border-emerald-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-slate-900 text-lg">
          {examLanguage === 'en' ? `Question ${idx + 1}:` : `Câu ${idx + 1}:`}
        </span>
        {isEssay && (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">
            {examLanguage === 'en' ? 'Essay' : 'Tự luận'}
          </span>
        )}
        {isSA && (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700">
            {examLanguage === 'en' ? 'Short Answer' : 'Trả lời ngắn'}
          </span>
        )}
        {isTF && (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">
            {examLanguage === 'en' ? 'True / False' : 'Đúng / Sai'}
          </span>
        )}
        {isMC && (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">
            {examLanguage === 'en' ? 'Multiple Choice' : 'Trắc nghiệm'}
          </span>
        )}
      </div>

      <div className="text-gray-800 text-base mb-4">
        <MathView content={questionContent} />
      </div>

      {q.imageUrl && (
        <div className="flex flex-col items-center justify-center my-4 p-2 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <img
            src={q.imageUrl}
            alt={`Hình minh họa câu ${idx + 1}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="max-h-80 max-w-full object-contain rounded-lg border border-slate-200 bg-white"
          />
          <span className="text-xs text-slate-500 mt-1 italic">Hình minh họa / Đồ thị câu {idx + 1}</span>
        </div>
      )}

      <div className="w-full space-y-2">
        {/* MULTIPLE CHOICE */}
        {isMC && q.options?.map((opt: string, oIdx: number) => {
          const isSelected = answer === oIdx;
          const isCorrect = oIdx === q.correctOptionIndex;
          
          let btnClass = "w-full min-h-[44px] flex items-center px-4 py-2 text-left rounded-lg border transition-colors break-words overflow-hidden gap-3 ";
          if (!isSubmitted) {
            btnClass += isSelected ? "bg-emerald-50 border-emerald-500 text-emerald-900" : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-700";
          } else {
            if (isCorrect) btnClass += "bg-emerald-50 border-emerald-500 text-emerald-900";
            else if (isSelected && !isCorrect) btnClass += "bg-red-50 border-red-500 text-red-900";
            else btnClass += "bg-white border-slate-200 text-slate-500 opacity-60";
          }
          
          return (
            <button 
              key={oIdx} 
              onClick={() => !isSubmitted && onAnswerChange(idx, oIdx)}
              disabled={isSubmitted}
              className={btnClass}
            >
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 font-bold text-xs ${isSelected && !isSubmitted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>
                {String.fromCharCode(65 + oIdx)}
              </div>
              <span className="flex-1 break-words overflow-hidden text-left"><MathView inline content={cleanOptionText(opt)} /></span>
              {isSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
            </button>
          );
        })}

        {/* TRUE / FALSE (4 Statements format - GDPT 2018) */}
        {isTF && q.tfStatements && q.tfStatements.length > 0 && (
          <div className="space-y-4">
            {q.tfStatements.map((stmt: any, sIdx: number) => {
              const ansMap = answer || {};
              const studentAns = ansMap[sIdx];
              const isTrue = stmt.correct === true || String(stmt.correct).toLowerCase() === 'true';
              const subLabel = ['a)', 'b)', 'c)', 'd)'][sIdx] || `${String.fromCharCode(97 + sIdx)})`;
              let cleanStmt = (stmt.statement || '').trim();
              cleanStmt = cleanStmt.replace(/^[a-d][\.\:\)]\s*/i, '');
              cleanStmt = sanitizeAndPolishMath(cleanStmt);
              
              return (
                <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex-1 flex items-start gap-2.5">
                    <span className="font-bold text-emerald-800 shrink-0 mt-0.5">{subLabel}</span>
                    <div className="flex-1">
                      <MathView content={cleanStmt} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      disabled={isSubmitted}
                      onClick={() => !isSubmitted && onAnswerChange(idx, { ...ansMap, [sIdx]: true })}
                      className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${studentAns === true ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'} ${(isSubmitted && isTrue) ? 'ring-2 ring-emerald-500' : ''}`}
                    >
                      Đúng
                    </button>
                    <button 
                      disabled={isSubmitted}
                      onClick={() => !isSubmitted && onAnswerChange(idx, { ...ansMap, [sIdx]: false })}
                      className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${studentAns === false ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'} ${(isSubmitted && !isTrue) ? 'ring-2 ring-emerald-500' : ''}`}
                    >
                      Sai
                    </button>
                    {isSubmitted && studentAns === isTrue && <CheckCircle2 className="w-5 h-5 text-emerald-600 ml-2" />}
                    {isSubmitted && studentAns !== undefined && studentAns !== isTrue && <XCircle className="w-5 h-5 text-red-600 ml-2" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* TRUE / FALSE (Single statement) */}
        {isTF && (!q.tfStatements || q.tfStatements.length === 0) && (
           <div className="flex items-center gap-3">
             <button 
                disabled={isSubmitted}
                onClick={() => !isSubmitted && onAnswerChange(idx, true)}
                className={`flex-1 py-4 rounded-xl border font-bold transition-colors ${answer === true ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                Đúng
              </button>
              <button 
                disabled={isSubmitted}
                onClick={() => !isSubmitted && onAnswerChange(idx, false)}
                className={`flex-1 py-4 rounded-xl border font-bold transition-colors ${answer === false ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                Sai
              </button>
           </div>
        )}

        {/* SHORT ANSWER */}
        {isSA && (
          <div className="space-y-3">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Nhập kết quả số (Tối đa 4 ký tự - Chuẩn GDPT 2018):
                </label>
                <span className="text-xs text-slate-500 font-mono">
                  Đã nhập: <strong className={(answer || '').length === 4 ? 'text-amber-600' : 'text-indigo-600'}>{(answer || '').length}/4</strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <input 
                    type="text" 
                    disabled={isSubmitted}
                    maxLength={4}
                    value={answer || ''}
                    onChange={(e) => {
                      const sanitized = sanitizeShortAnswerInput(e.target.value);
                      onAnswerChange(idx, sanitized);
                    }}
                    placeholder="vd: 22"
                    className={`w-36 text-center text-xl font-mono font-bold tracking-[0.45em] px-3 py-2.5 rounded-lg border-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all ${
                      isSubmitted && isCorrectQuestion 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900' 
                        : isSubmitted && !isCorrectQuestion 
                        ? 'border-red-500 bg-red-50 text-red-900' 
                        : 'border-indigo-400 bg-white text-indigo-950 focus:border-indigo-600'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-1" title="Mô phỏng 4 ô vuông trên phiếu thi trắc nghiệm">
                  {[0, 1, 2, 3].map((slotIdx) => {
                    const char = (answer || '')[slotIdx];
                    return (
                      <div
                        key={slotIdx}
                        className={`w-8 h-10 border-2 rounded flex items-center justify-center font-mono font-bold text-base transition-colors ${
                          char
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-2xs'
                            : 'border-dashed border-slate-300 bg-white text-slate-300'
                        }`}
                      >
                        {char || '•'}
                      </div>
                    );
                  })}
                </div>

                <div className="hidden sm:block text-[11px] text-slate-500 leading-tight">
                  <div>Chỉ chấp nhận: chữ số (0-9), dấu (-) và (, hoặc .)</div>
                  <div className="text-slate-400 italic">Ví dụ hợp lệ: 13, -3.5, 102, 0.5</div>
                </div>
              </div>

              {(() => {
                const curAns = answer;
                if (!curAns || isSubmitted) return null;
                const validation = validateShortAnswer(curAns);
                if (!validation.isValid && validation.warning) {
                  return (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{validation.warning}</span>
                    </div>
                  );
                }
                return null;
              })()}

              {!isSubmitted && (
                <div className="pt-2 border-t border-slate-200 mt-2">
                  <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                    <span>📱</span> Tô nhanh trực tuyến (Phiếu trắc nghiệm chuẩn Bộ 100%):
                  </p>
                  {(() => {
                    const ans = answer || "";
                    const cols = ["", "", "", ""];
                    const ansChars = ans.trim().replace(".", ",").split("");
                    for (let i = 0; i < Math.min(4, ansChars.length); i++) {
                      cols[i] = ansChars[i];
                    }

                    const updateCol = (colIdx: number, val: string) => {
                      const newCols = [...cols];
                      if (colIdx === 1 && val === ",") {
                        if (newCols[2] === ",") newCols[2] = "";
                      }
                      if (colIdx === 2 && val === ",") {
                        if (newCols[1] === ",") newCols[1] = "";
                      }

                      if (newCols[colIdx] === val) {
                        newCols[colIdx] = "";
                      } else {
                        newCols[colIdx] = val;
                      }
                      
                      const joined = newCols.join("").trim();
                      const newAns = joined.replace(/,/g, ".");
                      onAnswerChange(idx, newAns);
                    };

                    return (
                      <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-slate-200 max-w-[280px]">
                        {cols.map((char, colIdx) => (
                          <div key={colIdx} className="bg-slate-50 border border-slate-350 rounded h-8 flex items-center justify-center font-black text-sm text-slate-800 font-mono shadow-3xs">
                            {char}
                          </div>
                        ))}

                        {/* Column 1 bubbles (- and 0-9) */}
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateCol(0, "-")}
                            className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                              cols[0] === "-"
                                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                            }`}
                          >
                            -
                          </button>
                          {Array.from({ length: 10 }, (_, i) => String(i)).map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => updateCol(0, num)}
                              className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                                cols[0] === num
                                  ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                  : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>

                        {/* Column 2 bubbles (, and 0-9) */}
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateCol(1, ",")}
                            className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                              cols[1] === ","
                                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                            }`}
                          >
                            ,
                          </button>
                          {Array.from({ length: 10 }, (_, i) => String(i)).map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => updateCol(1, num)}
                              className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                                cols[1] === num
                                  ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                  : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>

                        {/* Column 3 bubbles (, and 0-9) */}
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateCol(2, ",")}
                            className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                              cols[2] === ","
                                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                            }`}
                          >
                            ,
                          </button>
                          {Array.from({ length: 10 }, (_, i) => String(i)).map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => updateCol(2, num)}
                              className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                                cols[2] === num
                                  ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                  : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>

                        {/* Column 4 bubbles (0-9 only) */}
                        <div className="flex flex-col items-center gap-1 pt-6.5">
                          {Array.from({ length: 10 }, (_, i) => String(i)).map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => updateCol(3, num)}
                              className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                                cols[3] === num
                                  ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                  : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {isSubmitted && (
              <div className="mt-2 text-sm flex items-center gap-2 flex-wrap p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                <span className="text-emerald-900 font-bold">Đáp án chuẩn:</span>
                <div className="font-mono font-bold text-base text-emerald-700 bg-white px-3 py-1 rounded border border-emerald-300">
                  <MathView inline content={sanitizeAndPolishMath(q.correctAnswer || q.correct || '')} />
                </div>
                {isCorrectQuestion ? (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Chính xác
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Chưa chính xác
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ESSAY */}
        {isEssay && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Nhập bài giải trực tiếp (nếu gõ phím):</span>
                <span className="text-slate-400 font-normal">Hỗ trợ gõ text / ký hiệu toán</span>
              </label>
              <textarea 
                disabled={isSubmitted}
                value={answer || ''}
                onChange={(e) => onAnswerChange(idx, e.target.value)}
                placeholder="Em có thể gõ các bước giải tự luận tại đây..."
                className="w-full p-4 rounded-xl border border-slate-300 bg-white text-slate-800 min-h-[140px] focus:ring-2 focus:ring-emerald-500 outline-none font-sans text-sm"
              />
            </div>

            {/* Camera / Upload photos of paper work */}
            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    Chụp ảnh bài làm trên giấy:
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Khuyến khích học sinh chụp rõ chữ, có thể chụp nhiều trang/ảnh
                  </p>
                </div>
                {!isSubmitted && (
                  <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    <span>📷 Chụp / Tải ảnh bài làm</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => onImageUpload(idx, e.target.files)}
                    />
                  </label>
                )}
              </div>

              {/* Preview Thumbnail Grid */}
              {essayImages && essayImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {essayImages.map((imgUrl, imgIdx) => (
                    <div key={imgIdx} className="relative group border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs aspect-3/4 flex items-center justify-center">
                      <img
                        src={imgUrl}
                        alt={`Ảnh bài làm trang ${imgIdx + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => onPreviewImage(imgUrl)}
                      />
                      <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                        Ảnh {imgIdx + 1}
                      </div>
                      {!isSubmitted && (
                        <button
                          type="button"
                          onClick={() => onRemoveEssayImage(idx, imgIdx)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition-colors"
                          title="Xóa ảnh này để chụp lại nếu bị mờ"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isSubmitted && (
              <div className="mt-4 p-4 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2">
                <span className="text-purple-900 font-bold block text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  Hướng dẫn chấm / Đáp án chuẩn tự luận:
                </span>
                <div className="text-slate-800 text-sm">
                  <MathView content={sanitizeAndPolishMath(q.correctAnswer || q.explanation || q.correct || '')} />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* EXPLANATION */}
        {isSubmitted && q.explanation && !isEssay && (
           <div className="mt-4 p-4 bg-slate-100 rounded-lg border border-slate-200">
             <span className="text-slate-500 font-semibold block mb-2">Giải thích:</span>
             <MathView content={sanitizeAndPolishMath(q.explanation || '')} />
           </div>
        )}
      </div>
    </div>
  );
});

export function StudentExamView({ examId, examRawData }: { examId?: string, examRawData?: string }) {
  const [loading, setLoading] = useState(Boolean(examId || examRawData));
  const [error, setError] = useState<string | null>(null);
  const [examData, setExamData] = useState<any>(null);
  const [inputPin, setInputPin] = useState(examId || '');
  
  const [isStarted, setIsStarted] = useState(false);
  const [studentInfo, setStudentInfo] = useState({ name: '', class: '' });
  const [studentCode, setStudentCode] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [showRosterSuggestions, setShowRosterSuggestions] = useState(false);
  
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [essayImages, setEssayImages] = useState<Record<number, string[]>>({});
  const [previewingImage, setPreviewingImage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [showCalculator, setShowCalculator] = useState(false);

  // Anti-Cheat & Proctoring States
  const [hasAcknowledgedAntiCheat, setHasAcknowledgedAntiCheat] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationReasonText, setViolationReasonText] = useState("");
  const [isViolationSubmission, setIsViolationSubmission] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullScreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullScreen(false)).catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Teacher Live Results Dashboard States
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherSubmissions, setTeacherSubmissions] = useState<any[]>([]);
  const [isTeacherLoading, setIsTeacherLoading] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [selectedSubDetail, setSelectedSubDetail] = useState<any | null>(null);

  const loadTeacherSubmissions = useCallback(async () => {
    setIsTeacherLoading(true);
    const activeCode = (examId || selectedCode || examData?.id || examData?.code || 'online_exam').trim();
    let mergedList: any[] = [];

    // A. LocalStorage
    try {
      const local = JSON.parse(localStorage.getItem('eduplan_exam_results') || '[]');
      if (Array.isArray(local)) {
        local.forEach((item: any) => {
          if (!activeCode || String(item.examId || '').toLowerCase() === activeCode.toLowerCase() || (item.examName && examData?.examName && String(item.examName).includes(examData.examName))) {
            mergedList.push(item);
          }
        });
      }
    } catch (e) {}

    // B. Backend Express API (/api/exams/:id?fresh=true)
    if (activeCode) {
      try {
        const res = await fetch(`/api/exams/${encodeURIComponent(activeCode)}?fresh=true`);
        if (res.ok) {
          const freshData = await res.json();
          if (freshData && Array.isArray(freshData.submissions)) {
            freshData.submissions.forEach((s: any) => {
              const isDup = mergedList.some((m: any) =>
                m.studentName === s.studentName &&
                m.studentClass === s.studentClass &&
                Math.abs(new Date(m.timestamp || m.submittedAt || 0).getTime() - new Date(s.timestamp || s.submittedAt || 0).getTime()) < 3 * 60 * 1000
              );
              if (!isDup) mergedList.push(s);
            });
          }
        }
      } catch (e) {}

      // C. Distributed Cloud KV
      try {
        const cloudExam = await fetchExamFromCloud(activeCode);
        if (cloudExam && Array.isArray(cloudExam.submissions)) {
          cloudExam.submissions.forEach((s: any) => {
            const isDup = mergedList.some((m: any) =>
              m.studentName === s.studentName &&
              m.studentClass === s.studentClass &&
              Math.abs(new Date(m.timestamp || m.submittedAt || 0).getTime() - new Date(s.timestamp || s.submittedAt || 0).getTime()) < 3 * 60 * 1000
            );
            if (!isDup) mergedList.push(s);
          });
        }
      } catch (e) {}
    }

    // D. Google Sheets Webhook
    try {
      const sheetRes = await fetch(SYSTEM_EXAM_WEBHOOK);
      if (sheetRes.ok) {
        const sheetData = await sheetRes.json();
        if (Array.isArray(sheetData)) {
          sheetData.forEach((s: any) => {
            if (s && String(s.examId || '').toLowerCase() === activeCode.toLowerCase()) {
              const isDup = mergedList.some((m: any) =>
                m.studentName === s.studentName &&
                m.studentClass === s.studentClass &&
                Math.abs(new Date(m.timestamp || m.submittedAt || 0).getTime() - new Date(s.timestamp || s.submittedAt || 0).getTime()) < 3 * 60 * 1000
              );
              if (!isDup) mergedList.push(s);
            }
          });
        }
      }
    } catch (e) {}

    mergedList.sort((a, b) => new Date(b.timestamp || b.submittedAt || 0).getTime() - new Date(a.timestamp || a.submittedAt || 0).getTime());
    setTeacherSubmissions(mergedList);
    setIsTeacherLoading(false);
  }, [examId, selectedCode, examData]);

  const exportTeacherExcel = () => {
    if (!teacherSubmissions || teacherSubmissions.length === 0) {
      alert("Chưa có lượt nộp bài nào để xuất Excel.");
      return;
    }
    const rows = teacherSubmissions.map((sub: any, idx: number) => ({
      "STT": idx + 1,
      "Họ và tên học sinh": sub.studentName || sub.name || "Ẩn danh",
      "Lớp": sub.studentClass || sub.className || "",
      "Thời gian nộp": sub.timestamp ? new Date(sub.timestamp).toLocaleString('vi-VN') : (sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN') : ""),
      "Điểm số": sub.score ?? sub.totalScore ?? 0,
      "Thời gian làm bài": sub.timeSpent || "",
      "Số câu đúng": sub.correctCount ?? sub.correct ?? 0,
      "Tổng số câu": sub.totalQuestions || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ket_Qua_Hoc_Sinh");
    const activeCode = (examId || selectedCode || 'online').trim();
    XLSX.writeFile(workbook, `Ket_Qua_Thi_Online_${activeCode}.xlsx`);
  };

  const fetchExamById = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchExamFromCloud(cleanId);

      if (!data) {
        throw new Error(`Không tìm thấy bài thi với mã "${cleanId}". Vui lòng kiểm tra lại mã PIN hoặc yêu cầu thầy/cô gửi lại link.`);
      }

      if (data.codeVersions || data.pdfBase64) {
        // Đây là đề thi PDF online -> chuyển hướng mượt sang chế độ phòng thi PDF
        window.location.replace(`/?view=exam_pdf&data=${cleanId}`);
        return;
      }

      setExamData(data);
      if (data.codes && data.codes.length > 0) {
        const randomCode = data.codes[Math.floor(Math.random() * data.codes.length)].code;
        setSelectedCode(randomCode);
      } else {
        setSelectedCode("101");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối đến phòng thi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let loaded = false;
    if (examRawData) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(examRawData);
        if (decompressed) {
          const data = JSON.parse(decompressed);
          if (data && (data.examData || data.codes || data.questions)) {
            setExamData(data);
            if (data.codes && data.codes.length > 0) {
              const randomCode = data.codes[Math.floor(Math.random() * data.codes.length)].code;
              setSelectedCode(randomCode);
            } else {
              setSelectedCode("101");
            }
            setLoading(false);
            loaded = true;
            return;
          }
        }
      } catch (e: any) {
        console.warn("Decompress hash exam data failed, trying fallback:", e);
      }

      if (!loaded) {
        try {
          const decompressedBase64 = LZString.decompress(examRawData);
          if (decompressedBase64) {
            const data = JSON.parse(decompressedBase64);
            if (data && (data.examData || data.codes || data.questions)) {
              setExamData(data);
              if (data.codes && data.codes.length > 0) {
                const randomCode = data.codes[Math.floor(Math.random() * data.codes.length)].code;
                setSelectedCode(randomCode);
              } else {
                setSelectedCode("101");
              }
              setLoading(false);
              loaded = true;
              return;
            }
          }
        } catch (e) {}
      }
    }
    
    if (examId && !loaded) {
      fetchExamById(examId);
    } else if (!loaded && !examId) {
      setLoading(false);
      setError("Không tìm thấy thông tin bài thi hoặc mã phòng thi.");
    }
  }, [examId, examRawData]);

  useEffect(() => {
    let timer: any;
    if (isStarted && !isSubmitted) {
      timer = setInterval(() => {
        setTimeSpent(prev => prev + 1);
        if (timeLeft !== null) {
          setTimeLeft(prev => {
            if (prev !== null && prev > 1) {
              return prev - 1;
            } else if (prev !== null && prev <= 1) {
              return 0;
            }
            return prev;
          });
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStarted, isSubmitted]);

  useEffect(() => {
    if (isStarted && !isSubmitted && timeLeft === 0) {
      handleSubmit();
      alert("Đã hết thời gian làm bài! Hệ thống tự động nộp bài.");
    }
  }, [timeLeft, isStarted, isSubmitted]);

  const examTitle = examData?.examData?.examName || examData?.examName || "Đề kiểm tra trực tuyến";
  const examType = examData?.examData?.examType || examData?.examType || "";
  const startTimeStr = examData?.examData?.startTime || examData?.startTime || null;
  const endTimeStr = examData?.examData?.endTime || examData?.endTime || null;
  const rawDuration = examData?.examData?.examDuration ?? examData?.examData?.duration ?? examData?.examDuration ?? examData?.duration;
  const isUnlimited = examData?.examData?.isUnlimitedTime || examData?.isUnlimitedTime || rawDuration === 0 || rawDuration === '0';
  const examDuration = isUnlimited ? 0 : (Number(rawDuration) || 45);

  const nowTimestamp = Date.now();
  const isBeforeStart = startTimeStr ? nowTimestamp < new Date(startTimeStr).getTime() : false;
  const isAfterEnd = endTimeStr ? nowTimestamp > new Date(endTimeStr).getTime() : false;

  const isAntiCheatEnabled = Boolean(
    examData?.antiCheatMode !== undefined 
      ? examData.antiCheatMode 
      : examData?.examData?.antiCheatMode !== undefined 
        ? examData.examData.antiCheatMode 
        : true
  );

  const handleSubmitRef = React.useRef<(info?: any) => void>(() => {});

  // Anti-Cheat & Auto-Submit on tab switch / window blur
  useEffect(() => {
    if (!isStarted || isSubmitted || !isAntiCheatEnabled) return;

    let hasViolated = false;

    const triggerViolationSubmit = (reason: string) => {
      if (hasViolated || isSubmitted) return;
      hasViolated = true;
      setViolationReasonText(reason);
      setShowViolationModal(true);
      handleSubmitRef.current?.({ isViolation: true, violationReason: reason });
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        triggerViolationSubmit('Học sinh chuyển tab trình duyệt hoặc ẩn cửa sổ làm bài thi.');
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        if ((document.hidden || !document.hasFocus()) && !hasViolated && !isSubmitted) {
          triggerViolationSubmit('Học sinh thoát/rời khỏi cửa sổ làm bài thi (mở tab hoặc ứng dụng khác).');
        }
      }, 350);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      triggerViolationSubmit('Học sinh cố gắng tải lại hoặc thoát trang thi.');
      e.preventDefault();
      e.returnValue = 'Nếu bạn rời khỏi trang, bài thi sẽ bị tự động nộp ngay lập tức!';
      return e.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isStarted, isSubmitted, isAntiCheatEnabled]);

  const [translatedQuestions, setTranslatedQuestions] = useState<any[] | null>(null);
  const [examLanguage, setExamLanguage] = useState<'vi' | 'en'>('vi');

  const handleTranslatedQuestionsChange = useCallback((newQuestions: any[], newLang: 'vi' | 'en') => {
    setTranslatedQuestions(newQuestions);
    setExamLanguage(newLang);
  }, []);

  const currentExam = React.useMemo(() => {
    if (!examData) return null;
    if (Array.isArray(examData.codes) && examData.codes.length > 0) {
      return examData.codes.find((c: any) => c.code === selectedCode) || examData.codes[0];
    }
    if (Array.isArray(examData.questions) && examData.questions.length > 0) {
      return { code: selectedCode || "101", questions: examData.questions };
    }
    return null;
  }, [examData, selectedCode]);

  useEffect(() => {
    setTranslatedQuestions(null);
    setExamLanguage('vi');
  }, [selectedCode, examData]);

  const displayQuestions = translatedQuestions || currentExam?.questions || [];

  const allExamText = React.useMemo(() => {
    if (!displayQuestions || displayQuestions.length === 0) return '';
    return displayQuestions.map((q: any, idx: number) => {
      const qStem = q.content || q.question || '';
      const qOpts = Array.isArray(q.options) ? q.options.map((o: string, i: number) => `${String.fromCharCode(65 + i)}. ${o}`).join('  ') : '';
      return `${examLanguage === 'en' ? 'Question' : 'Câu'} ${idx + 1}: ${qStem}\n${qOpts}`;
    }).join('\n\n');
  }, [displayQuestions, examLanguage]);

  const handleAnswerChange = useCallback((idx: number, ans: any) => {
    setAnswers(prev => ({ ...prev, [idx]: ans }));
  }, []);

  const handleImageUpload = useCallback((qIdx: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64) {
          setEssayImages(prev => ({
            ...prev,
            [qIdx]: [...(prev[qIdx] || []), base64]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeEssayImage = useCallback((qIdx: number, imgIdx: number) => {
    setEssayImages(prev => {
      const list = [...(prev[qIdx] || [])];
      list.splice(imgIdx, 1);
      return { ...prev, [qIdx]: list };
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-slate-600 text-sm font-medium">Đang tải đề thi...</p>
      </div>
    );
  }

  if (!examData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Vào Phòng Thi Online</h1>
          <p className="text-center text-slate-500 mb-6 text-sm">Nhập mã đề thi do giáo viên cung cấp để bắt đầu làm bài</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <p className="font-semibold mb-1">Thông báo:</p>
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã đề / Mã phòng thi</label>
              <input 
                type="text" 
                value={inputPin} 
                onChange={e => setInputPin(e.target.value.toUpperCase())} 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-center text-xl font-bold tracking-widest uppercase outline-none" 
                placeholder="VD: K8F3KD" 
                autoFocus
              />
            </div>
            <button 
              disabled={!inputPin.trim()}
              onClick={() => fetchExamById(inputPin.trim())}
              className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Vào Phòng Thi
            </button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <span>💡</span> Lưu ý nếu mở qua Zalo:
            </p>
            <p>Nếu gặp thông báo link bị chặn hoặc không mở được, em hãy bấm vào biểu tượng <strong>dấu 3 chấm (···)</strong> ở góc trên bên phải màn hình Zalo, rồi chọn <strong>"Mở bằng trình duyệt"</strong> (Chrome hoặc Safari).</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (violationInfo?: { isViolation: boolean; violationReason: string }) => {
    if (!currentExam || !currentExam.questions) return;
    
    // Check if fully answered
    let answeredCount = 0;
    currentExam.questions.forEach((q: any, idx: number) => {
      const ans = answers[idx];
      const qType = String(q.type || '').toUpperCase();
      if (q.type === 'mc' || qType === 'MULTIPLE_CHOICE' || (!q.type && q.options)) {
        if (ans !== undefined) answeredCount++;
      } else if (q.type === 'tf' || qType === 'TRUE_FALSE') {
        if (ans && Object.keys(ans).length === 4) answeredCount++; // Vietnam standard TF has 4 statements
        else if (ans !== undefined) answeredCount++; // Or single TF
      } else if (q.type === 'sa' || qType === 'SHORT_ANSWER') {
        if (ans && String(ans).trim().length > 0) answeredCount++;
      } else if (q.type === 'essay' || qType === 'ESSAY') {
        const hasText = ans && String(ans).trim().length > 0;
        const hasImgs = essayImages[idx] && essayImages[idx].length > 0;
        if (hasText || hasImgs) answeredCount++;
      }
    });

    if (!violationInfo && answeredCount < currentExam.questions.length) {
      if (!confirm("Bạn chưa làm hết các câu hỏi. Bạn có chắc chắn muốn nộp bài?")) return;
    }
    
    let totalScore = 0;
    let fullCorrectCount = 0;
    let wrongCount = 0;
    
    const objectiveQuestions = currentExam.questions.filter((q: any) => {
      const qType = String(q.type || '').toUpperCase();
      return q.type !== 'essay' && qType !== 'ESSAY';
    });

    const detailedAnswers: Array<{
      questionIndex: number;
      questionNumber: number;
      questionText: string;
      questionContent: string;
      options?: string[];
      studentAnswer: string;
      studentChoice: string;
      correctAnswer: string;
      correctChoice: string;
      isCorrect: boolean;
      type: string;
      hasAnswered: boolean;
      tfDetails?: Array<{
        sub: string;
        statement: string;
        studentChoice: string;
        correctChoice: string;
        isCorrect: boolean;
        hasAnswered: boolean;
      }>;
      explanation?: string;
      solution?: string;
      essayText?: string;
      essayImages?: string[];
    }> = [];

    currentExam.questions.forEach((q: any, idx: number) => {
      const ans = answers[idx];
      let isCorrect = false;
      let isWrong = false;
      const qType = String(q.type || '').toUpperCase();
      const qNum = idx + 1;
      const content = q.content || q.question || q.text || '';
      const explanation = q.explanation || q.solution || '';
      
      if (q.type === 'essay' || qType === 'ESSAY') {
        const textAns = String(answers[idx] || '').trim();
        const imgs = essayImages[idx] || [];
        const hasAns = textAns.length > 0 || imgs.length > 0;
        const studentAns = textAns || (imgs.length > 0 ? `[Đã đính kèm ${imgs.length} ảnh]` : 'Chưa trả lời');
        const studentChoice = textAns || (imgs.length > 0 ? `[Đã đính kèm ${imgs.length} ảnh]` : 'Chưa làm');
        const correctAns = q.correctAnswer || q.explanation || 'Tự luận (GV chấm)';
        detailedAnswers.push({
          questionIndex: qNum,
          questionNumber: qNum,
          questionText: content,
          questionContent: content,
          options: q.options || [],
          studentAnswer: studentAns,
          studentChoice: studentChoice,
          correctAnswer: correctAns,
          correctChoice: correctAns,
          isCorrect: false,
          type: 'essay',
          hasAnswered: hasAns,
          explanation,
          solution: explanation,
          essayText: textAns,
          essayImages: imgs
        });
      } else if (q.type === 'mc' || qType === 'MULTIPLE_CHOICE' || (!q.type && q.options)) {
        if (ans === q.correctOptionIndex) { totalScore += 1; isCorrect = true; }
        else if (ans !== undefined) { isWrong = true; }

        const optLetter = (ans !== undefined && ans >= 0 && ans <= 3) ? String.fromCharCode(65 + ans) : '';
        const corrLetter = (q.correctOptionIndex !== undefined && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3) 
          ? String.fromCharCode(65 + q.correctOptionIndex) 
          : (String(q.correctAnswer || q.answer || 'A').toUpperCase().charAt(0));

        detailedAnswers.push({
          questionIndex: qNum,
          questionNumber: qNum,
          questionText: content,
          questionContent: content,
          options: q.options || [],
          studentAnswer: optLetter || 'Chưa trả lời',
          studentChoice: optLetter || 'Chưa làm',
          correctAnswer: corrLetter,
          correctChoice: corrLetter,
          isCorrect,
          type: 'mc',
          hasAnswered: ans !== undefined,
          explanation,
          solution: explanation
        });
      } else if (q.type === 'tf' || qType === 'TRUE_FALSE') {
        if (q.tfStatements && q.tfStatements.length > 0) {
           let correctCount = 0;
           let answered = false;
           const tfDetails = q.tfStatements.map((stmt: any, sIdx: number) => {
             const sub = String.fromCharCode(97 + sIdx);
             const studentAns = ans ? ans[sIdx] : undefined;
             if (studentAns !== undefined) answered = true;
             const isTrue = stmt.correct === true || String(stmt.correct).toLowerCase() === 'true';
             const isSubOk = studentAns !== undefined && studentAns === isTrue;
             if (isSubOk) correctCount++;
             return {
               sub,
               statement: stmt.statement || stmt.text || '',
               studentChoice: studentAns === true ? 'Đúng' : studentAns === false ? 'Sai' : 'Chưa chọn',
               correctChoice: isTrue ? 'Đúng' : 'Sai',
               isCorrect: isSubOk,
               hasAnswered: studentAns !== undefined
             };
           });

           if (correctCount === 1) totalScore += 0.1;
           else if (correctCount === 2) totalScore += 0.25;
           else if (correctCount === 3) totalScore += 0.5;
           else if (correctCount === 4) { totalScore += 1.0; isCorrect = true; }
           
           if (answered && correctCount < 4) isWrong = true;

           const studentChoiceStr = tfDetails.map(t => `${t.sub}:${t.studentChoice === 'Đúng' ? 'Đ' : t.studentChoice === 'Sai' ? 'S' : '-'}`).join(' ');
           const correctChoiceStr = tfDetails.map(t => `${t.sub}:${t.correctChoice === 'Đúng' ? 'Đ' : 'S'}`).join(' ');

           detailedAnswers.push({
             questionIndex: qNum,
             questionNumber: qNum,
             questionText: content,
             questionContent: content,
             options: q.options || [],
             studentAnswer: answered ? studentChoiceStr : 'Chưa trả lời',
             studentChoice: answered ? studentChoiceStr : 'Chưa làm',
             correctAnswer: correctChoiceStr,
             correctChoice: correctChoiceStr,
             isCorrect,
             type: 'tf',
             hasAnswered: answered,
             tfDetails,
             explanation,
             solution: explanation
           });
        } else {
           const isTrue = q.correct === true || String(q.correct).toLowerCase() === 'true' || String(q.correctAnswer).toLowerCase().includes('đúng');
           if (ans === isTrue) { totalScore += 1; isCorrect = true; }
           else if (ans !== undefined) { isWrong = true; }

           detailedAnswers.push({
             questionIndex: qNum,
             questionNumber: qNum,
             questionText: content,
             questionContent: content,
             options: q.options || [],
             studentAnswer: ans === true ? 'Đúng' : ans === false ? 'Sai' : 'Chưa trả lời',
             studentChoice: ans === true ? 'Đúng' : ans === false ? 'Sai' : 'Chưa làm',
             correctAnswer: isTrue ? 'Đúng' : 'Sai',
             correctChoice: isTrue ? 'Đúng' : 'Sai',
             isCorrect,
             type: 'tf',
             hasAnswered: ans !== undefined,
             explanation,
             solution: explanation
           });
        }
      } else if (q.type === 'sa' || qType === 'SHORT_ANSWER') {
         const correctAns = String(q.correctAnswer || q.correct || q.answer || '').trim();
         const studentAns = String(ans || '').trim();
         if (correctAns && compareShortAnswers(studentAns, correctAns)) { totalScore += 1; isCorrect = true; }
         else if (ans !== undefined && studentAns !== '') { isWrong = true; }

         detailedAnswers.push({
           questionIndex: qNum,
           questionNumber: qNum,
           questionText: content,
           questionContent: content,
           options: q.options || [],
           studentAnswer: studentAns || 'Chưa trả lời',
           studentChoice: studentAns || 'Chưa làm',
           correctAnswer: correctAns,
           correctChoice: correctAns,
           isCorrect,
           type: 'sa',
           hasAnswered: studentAns.length > 0,
           explanation,
           solution: explanation
         });
      }
      
      if (isCorrect) fullCorrectCount++;
      if (isWrong) wrongCount++;
    });
    
    const finalScore = objectiveQuestions.length > 0 ? (totalScore / objectiveQuestions.length) * 10 : 0;
    setScore(finalScore);
    setIsSubmitted(true);
    
    // Save result to localStorage
    const hasEssayQuestions = Boolean(currentExam?.questions?.some((q: any) => {
      const qType = String(q.type || '').toUpperCase();
      return q.type === 'essay' || qType === 'ESSAY';
    }));

    const resultToSave = {
      id: Date.now().toString(),
      examId: currentExam?.code || examId || 'online_exam',
      examName: examData.examName || examTitle || 'Phiếu bài tập',
      examType: examType || '',
      duration: isUnlimited ? 'Không giới hạn' : examDuration,
      studentName: studentInfo.name || 'Học sinh ẩn danh',
      studentClass: studentInfo.class || '',
      score: Number(finalScore.toFixed(2)),
      correct: fullCorrectCount,
      incorrect: wrongCount,
      unanswered: objectiveQuestions.length - fullCorrectCount - wrongCount,
      totalQuestions: currentExam.questions.length,
      hasEssay: hasEssayQuestions,
      detailedAnswers: detailedAnswers,
      essaySubmissions: currentExam.questions.map((q: any, idx: number) => {
        const qType = String(q.type || '').toUpperCase();
        if (q.type === 'essay' || qType === 'ESSAY') {
          return {
            questionIndex: idx + 1,
            questionContent: q.content || q.question || q.text || '',
            imageUrl: q.imageUrl || '',
            textAnswer: answers[idx] || '',
            images: essayImages[idx] || []
          };
        }
        return null;
      }).filter(Boolean),
      questionsSnapshot: currentExam.questions.map((q: any, idx: number) => {
        const qType = String(q.type || '').toUpperCase();
        return {
          index: idx + 1,
          type: q.type || qType,
          content: q.content || q.question || q.text || '',
          options: q.options,
          tfStatements: q.tfStatements,
          correctOptionIndex: q.correctOptionIndex,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          imageUrl: q.imageUrl,
          studentAnswer: answers[idx],
          studentImages: essayImages[idx] || []
        };
      }),
      answers: answers,
      timeSpent: timeSpent, // in seconds
      submittedAt: new Date().toISOString()
    };
    
    const currentExamId = (currentExam?.code || examId || selectedCode || examData?.id || 'online_exam').trim().toUpperCase();
    const formattedTimeSpent = `${Math.floor(timeSpent / 60)} phút ${timeSpent % 60} giây`;
    const calculatedScore = Number(finalScore.toFixed(2));
    const uploadedEssayImages: string[] = Object.values(essayImages).flat();

    const submitPayload: any = {
      examId: currentExamId,
      examName: examTitle,
      examType: examType || 'Đề kiểm tra',
      duration: isUnlimited ? 'Không giới hạn' : `${examDuration} phút`,
      studentName: studentInfo.name || 'Học sinh ẩn danh',
      className: studentInfo.class || '',
      studentClass: studentInfo.class || '',
      score: calculatedScore,
      totalScore: calculatedScore,
      correctCount: fullCorrectCount,
      totalQuestions: currentExam.questions.length,
      timeSpent: formattedTimeSpent,
      timestamp: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      detailedAnswers: JSON.stringify(detailedAnswers),
      essayImages: JSON.stringify(uploadedEssayImages || []),
      ...resultToSave
    };

    if (violationInfo?.isViolation) {
      submitPayload.isViolation = true;
      submitPayload.violationReason = violationInfo.violationReason;
      submitPayload.violationTime = new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN');
      setIsViolationSubmission(true);
    }

    // 1. Save to Student's LocalStorage & Room Cache
    try {
      const existingResults = JSON.parse(localStorage.getItem('eduplan_exam_results') || '[]');
      existingResults.push(submitPayload);
      localStorage.setItem('eduplan_exam_results', JSON.stringify(existingResults));
    } catch(e) {
      console.error("Lỗi lưu kết quả local:", e);
    }

    // 2. Submit to Backend Express Server API (/api/exams/:id/submit)
    try {
      apiFetch(`/api/exams/${encodeURIComponent(currentExamId)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitPayload)
      }).catch(err => console.warn("Lỗi gửi API server:", err));
    } catch (e) {}

    // 3. Direct sync to Cloud KV (distributed resilient persistence)
    (async () => {
      try {
        const cloudExam = await fetchExamFromCloud(currentExamId);
        if (cloudExam) {
          cloudExam.submissions = cloudExam.submissions || [];
          const isDup = cloudExam.submissions.some((s: any) =>
            s.studentName === submitPayload.studentName &&
            s.studentClass === submitPayload.studentClass &&
            Math.abs(new Date(s.timestamp || s.submittedAt || Date.now()).getTime() - Date.now()) < 3 * 60 * 1000
          );
          if (!isDup) {
            cloudExam.submissions.push(submitPayload);
            await saveExamToCloud(currentExamId, cloudExam);
          }
        }
      } catch (e) {
        console.warn("Lỗi lưu trực tiếp Cloud KV:", e);
      }
    })();

    // 4. Send to Webhook (Google Sheets)
    try {
      fetch(SYSTEM_EXAM_WEBHOOK, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitPayload)
      }).catch(err => {
        console.warn("Lỗi gửi Webhook điểm thi:", err);
      });
    } catch (err) {
      console.warn("Lỗi gọi fetch Webhook:", err);
    }
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
          </div>

          {examType && (
            <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold mb-2">
              {examType}
            </div>
          )}

          <h1 className="text-2xl font-bold text-slate-800 mb-2">{examTitle}</h1>
          <p className="text-slate-500 mb-4 text-sm">
            Thời lượng: <strong className="text-emerald-700 font-semibold">{isUnlimited ? "Không giới hạn thời gian" : `${examDuration} phút`}</strong>
          </p>

          <button
            type="button"
            onClick={() => {
              setShowTeacherModal(true);
              loadTeacherSubmissions();
            }}
            className="w-full mb-5 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>📊 Xem báo cáo kết quả phòng thi (Dành cho Giáo viên)</span>
          </button>

          {/* Schedule Warnings */}
          {isBeforeStart && startTimeStr && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs text-left space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <span>🕒</span> Phòng thi chưa đến giờ mở đề!
              </p>
              <p>Thời gian bắt đầu làm bài: <strong>{new Date(startTimeStr).toLocaleString('vi-VN')}</strong>. Vui lòng quay lại vào đúng khung giờ trên.</p>
            </div>
          )}

          {isAfterEnd && endTimeStr && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs text-left space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-900">
                <span>⛔</span> Đã hết thời hạn làm bài!
              </p>
              <p>Phòng thi đã đóng lúc: <strong>{new Date(endTimeStr).toLocaleString('vi-VN')}</strong>. Hệ thống không còn nhận bài làm mới.</p>
            </div>
          )}
          
          {(() => {
            const rawAllowedStudents = examData?.allowedStudents || examData?.examData?.allowedStudents || [];
            const loginMethod = examData?.loginMethod || examData?.examData?.loginMethod || "C";

            return (
              <>
                {loginMethod === "B" ? (
                  /* Login Method B: Code verification */
                  <div className="space-y-4 mb-6 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                        Mã học sinh / Mã định danh của bạn
                      </label>
                      <input 
                        type="text" 
                        value={studentCode} 
                        onChange={e => {
                          const code = e.target.value.trim().toUpperCase();
                          setStudentCode(code);
                          const matched = rawAllowedStudents.find((s: any) => String(s.code).toUpperCase() === code);
                          if (matched) {
                            setStudentInfo({ name: matched.name, class: studentInfo.class || matched.class || '12A' });
                          } else {
                            setStudentInfo({ name: '', class: studentInfo.class });
                          }
                        }} 
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-center text-lg font-black tracking-widest uppercase outline-none" 
                        placeholder="Ví dụ: HS01" 
                        disabled={isBeforeStart || isAfterEnd}
                      />
                      {studentCode && (
                        <div className="mt-2 text-xs text-center">
                          {studentInfo.name ? (
                            <p className="text-emerald-600 font-bold flex items-center justify-center gap-1">
                              <span>✅</span> Mã hợp lệ! Xin chào: <strong>{studentInfo.name}</strong>
                            </p>
                          ) : (
                            <p className="text-rose-500 font-semibold flex items-center justify-center gap-1">
                              <span>❌</span> Mã định danh không tồn tại hoặc không chính xác!
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Lớp học</label>
                      <input 
                        type="text" 
                        value={studentInfo.class} 
                        onChange={e => setStudentInfo({...studentInfo, class: e.target.value})} 
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-semibold" 
                        placeholder="Ví dụ: 12A1" 
                        disabled={isBeforeStart || isAfterEnd}
                      />
                    </div>
                  </div>
                ) : (
                  /* Login Method C / default with suggestions */
                  <div className="space-y-4 mb-6 text-left">
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Họ và tên học sinh</label>
                      <input 
                        type="text" 
                        value={studentInfo.name} 
                        onFocus={() => setShowRosterSuggestions(true)}
                        onChange={e => {
                          setStudentInfo({...studentInfo, name: e.target.value});
                          setRosterSearch(e.target.value);
                          setShowRosterSuggestions(true);
                        }} 
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-800" 
                        placeholder="Nhập tên hoặc chọn nhanh bên dưới..." 
                        disabled={isBeforeStart || isAfterEnd}
                      />
                      
                      {/* Searchable suggestions dropdown */}
                      {showRosterSuggestions && rawAllowedStudents.length > 0 && (
                        <div className="absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                          <div className="p-2 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider sticky top-0 flex justify-between items-center">
                            <span>Danh sách học sinh lớp</span>
                            <button 
                              type="button" 
                              onClick={() => setShowRosterSuggestions(false)} 
                              className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                            >
                              Đóng [x]
                            </button>
                          </div>
                          {(() => {
                            const filtered = rawAllowedStudents.filter((s: any) => {
                              const q = rosterSearch.trim().toLowerCase();
                              if (!q) return true;
                              return String(s.name).toLowerCase().includes(q) || String(s.code).toLowerCase().includes(q);
                            });
                            
                            if (filtered.length === 0) {
                              return <div className="p-3 text-center text-xs text-slate-400 font-medium">Không tìm thấy tên trong danh sách</div>;
                            }
                            
                            return filtered.map((s: any, idx: number) => (
                              <div 
                                key={idx} 
                                onClick={() => {
                                  setStudentInfo({
                                    name: s.name,
                                    class: studentInfo.class || s.class || "12A"
                                  });
                                  setRosterSearch(s.name);
                                  setShowRosterSuggestions(false);
                                }}
                                className="p-3 text-xs text-slate-700 font-semibold hover:bg-emerald-50 hover:text-emerald-950 cursor-pointer transition-colors flex items-center justify-between"
                              >
                                <span>{s.name}</span>
                                <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase font-bold">{s.code}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                      {rawAllowedStudents.length > 0 && (
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                          💡 Hãy click vào ô nhập Họ tên để chọn nhanh tên của em từ danh sách gợi ý!
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Lớp học</label>
                      <input 
                        type="text" 
                        value={studentInfo.class} 
                        onChange={e => setStudentInfo({...studentInfo, class: e.target.value})} 
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-800" 
                        placeholder="Ví dụ: 12A1" 
                        disabled={isBeforeStart || isAfterEnd}
                      />
                    </div>
                  </div>
                )}

                {/* CẢNH BÁO GIÁM SÁT THI & CHỐNG RỜI TAB */}
                {isAntiCheatEnabled && (
                  <div className="mb-5 p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl text-left space-y-2.5 animate-in fade-in">
                    <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs uppercase tracking-wide">
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
                      <span>Quy chế thi: Đang bật giám sát chống rời tab!</span>
                    </div>
                    <div className="text-xs text-rose-700 space-y-1.5 font-medium leading-relaxed">
                      <p className="flex items-start gap-1.5">
                        <span className="text-rose-600 font-bold">•</span>
                        <span><strong>TUYỆT ĐỐI KHÔNG CHUYỂN TAB</strong> sang bất kỳ tab trình duyệt hoặc ứng dụng nào khác (Zalo, Google, Facebook,...).</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="text-rose-600 font-bold">•</span>
                        <span className="text-rose-900 font-black underline">
                          NẾU RỜI KHỎI TAB THI HOẶC ẨN CỬA SỔ, BÀI THI SẼ TỰ ĐỘNG THU & NỘP NGAY LẬP TỨC!
                        </span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="text-rose-600 font-bold">•</span>
                        <span>Biên bản vi phạm rời tab kèm thời gian sẽ được gửi trực tiếp về cho Thầy/Cô.</span>
                      </p>
                    </div>

                    <label className="flex items-center gap-2.5 pt-2.5 border-t border-rose-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasAcknowledgedAntiCheat}
                        onChange={(e) => setHasAcknowledgedAntiCheat(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded border-rose-400 focus:ring-rose-500 cursor-pointer"
                      />
                      <span className="text-xs text-rose-950 font-bold">
                        Em đã đọc kỹ quy chế và cam kết KHÔNG RỜI KHỎI TAB THI trong suốt thời gian làm bài.
                      </span>
                    </label>
                  </div>
                )}

                <button 
                  disabled={
                    !studentInfo.name.trim() || 
                    !studentInfo.class.trim() || 
                    isBeforeStart || 
                    isAfterEnd ||
                    (loginMethod === "B" && !rawAllowedStudents.some((s: any) => String(s.code).toUpperCase() === studentCode.toUpperCase()))
                  }
                  onClick={() => {
                    const currentNow = Date.now();
                    if (startTimeStr && currentNow < new Date(startTimeStr).getTime()) {
                      alert(`Phòng thi chưa đến giờ mở đề! Giờ mở đề: ${new Date(startTimeStr).toLocaleString('vi-VN')}`);
                      return;
                    }
                    if (endTimeStr && currentNow > new Date(endTimeStr).getTime()) {
                      alert(`Đã hết thời hạn làm bài thi! Phòng thi đã đóng lúc ${new Date(endTimeStr).toLocaleString('vi-VN')}`);
                      return;
                    }

                    if (isAntiCheatEnabled && !hasAcknowledgedAntiCheat) {
                      alert("⚠️ Vui lòng tích chọn xác nhận cam kết 'Không rời khỏi tab thi' trước khi bắt đầu làm bài!");
                      return;
                    }

                    setIsStarted(true);
                    const mins = parseInt(String(examDuration), 10);
                    if (!isUnlimited && !isNaN(mins) && mins > 0) {
                      let totalSecs = mins * 60;
                      if (endTimeStr) {
                        const secsUntilEnd = Math.floor((new Date(endTimeStr).getTime() - currentNow) / 1000);
                        if (secsUntilEnd > 0 && secsUntilEnd < totalSecs) {
                          totalSecs = secsUntilEnd;
                        }
                      }
                      setTimeLeft(totalSecs);
                    } else {
                      setTimeLeft(null);
                    }
                  }}
                  className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer"
                >
                  {isBeforeStart 
                    ? "Chưa đến giờ mở đề" 
                    : isAfterEnd 
                    ? "Phòng thi đã đóng" 
                    : `Bắt đầu làm bài ${isUnlimited ? "(Không giới hạn thời gian)" : `(${examDuration} phút)`}`}
                </button>
              </>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-800 truncate max-w-md">{examTitle}</h1>
              {examType && (
                <span className="hidden sm:inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-[11px] font-semibold">
                  {examType}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Học sinh: {studentInfo.name} - Lớp: {studentInfo.class} (Mã đề: {currentExam?.code || selectedCode || "101"})</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSpeechControls
              content={allExamText}
              questions={currentExam?.questions || []}
              onQuestionsChange={handleTranslatedQuestionsChange}
              subject={examData?.subject || "Toán"}
            />

            {isStarted && !isSubmitted && (
              timeLeft !== null ? (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold border text-sm ${
                  timeLeft <= 300 
                    ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span>{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold border border-emerald-200 text-xs sm:text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Không giới hạn</span>
                </div>
              )
            )}
            {!isSubmitted && (
              <button onClick={() => handleSubmit()} className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 text-sm shadow-sm cursor-pointer">
                Nộp Bài
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Zalo browser recommendation banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
          <span>💡 <strong>Mẹo làm bài trên Zalo:</strong> Để công thức hiển thị mượt mà nhất, bạn có thể bấm <strong>(···)</strong> góc trên và chọn <em>"Mở bằng trình duyệt"</em>.</span>
        </div>

        {/* Anti-cheat proctoring active banner */}
        {!isSubmitted && isAntiCheatEnabled && (
          <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white px-4 py-3 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 text-xs font-bold border border-rose-400">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-300 animate-bounce" />
              </div>
              <div>
                <span className="font-black tracking-wide text-amber-200 uppercase">
                  Chế độ giám sát tab đang hoạt động:
                </span>
                <span className="ml-1 text-white font-medium">
                  TUYỆT ĐỐI KHÔNG CHUYỂN TAB HOẶC RỜI KHỎI MÀN HÌNH NÀY! Nếu rời tab tra cứu đáp án, bài thi sẽ bị tự động nộp ngay lập tức.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleFullScreen}
              className="px-3 py-1.5 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              {isFullScreen ? "Thoát toàn màn hình" : "Bật Toàn màn hình (Khuyên dùng)"}
            </button>
          </div>
        )}

        {isSubmitted && (
          <div className={`bg-white p-8 rounded-2xl shadow-sm border ${isViolationSubmission ? 'border-rose-400' : 'border-emerald-200'} text-center relative overflow-hidden`}>
            <div className={`absolute top-0 left-0 w-full h-2 ${isViolationSubmission ? 'bg-rose-600' : 'bg-emerald-500'}`}></div>

            {isViolationSubmission && (
              <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl text-left space-y-2">
                <div className="flex items-center gap-2 text-rose-700 font-black text-sm uppercase">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
                  <span>BÀI THI BỊ TỰ ĐỘNG THU & NỘP DO VI PHẠM RỜI KHỎI TAB THI ONLINE</span>
                </div>
                <p className="text-xs text-rose-800 font-medium leading-relaxed">
                  Hệ thống phát hiện học sinh đã thoát khỏi màn hình thi (chuyển tab hoặc ẩn cửa sổ trình duyệt).
                  Theo quy định phòng thi chống gian lận, bài thi đã bị kết thúc và nộp tự động về cho Thầy/Cô kèm biên bản vi phạm.
                </p>
                <p className="text-[11px] text-rose-600 font-mono">
                  Lý do vi phạm: {violationReasonText || "Học sinh chuyển tab trình duyệt tra cứu đáp án"}
                </p>
              </div>
            )}

            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              {currentExam?.questions?.some((q: any) => q.type === 'essay' || String(q.type || '').toUpperCase() === 'ESSAY')
                ? `Điểm trắc nghiệm: ${score.toFixed(1)}/10`
                : `Điểm của bạn: ${score.toFixed(1)}/10`}
            </h2>
            {currentExam?.questions?.some((q: any) => q.type === 'essay' || String(q.type || '').toUpperCase() === 'ESSAY') ? (
              <div className="mb-4 inline-block bg-purple-50 border border-purple-200 text-purple-900 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-2xs">
                Đã ghi nhận điểm trắc nghiệm {score.toFixed(1)} điểm. Bài tự luận đã được nộp để giáo viên chấm điểm.
              </div>
            ) : (
              <p className="text-slate-600 mb-4">Bạn đã hoàn thành bài kiểm tra. Xem chi tiết đáp án bên dưới.</p>
            )}
            <div>
              <button onClick={() => {
                const essaySubmissions = currentExam.questions.map((q: any, idx: number) => {
                  const qType = String(q.type || '').toUpperCase();
                  if (q.type === 'essay' || qType === 'ESSAY') {
                    const imgCount = essayImages[idx]?.length || 0;
                    return `Câu ${idx + 1}: ${answers[idx] ? `Có gõ bài làm` : `Đã nộp`}${imgCount > 0 ? ` + ${imgCount} ảnh bài giải` : ''}`;
                  }
                  return null;
                }).filter(Boolean);

                const essayNote = essaySubmissions.length > 0 
                  ? `\nPhần tự luận: Đã nộp ${essaySubmissions.length} câu để GV chấm (${essaySubmissions.join('; ')})` 
                  : '';
                const txt = `Học sinh: ${studentInfo.name} - Lớp: ${studentInfo.class}\nĐã hoàn thành Đề: ${examTitle}\nMã đề: ${currentExam?.code || selectedCode || "101"}\nĐiểm trắc nghiệm: ${score.toFixed(1)}/10${essayNote}\nThời gian làm bài: ${Math.floor(timeSpent/60)} phút ${timeSpent%60} giây`;
                navigator.clipboard.writeText(txt);
                alert("Đã sao chép kết quả! Bạn có thể gửi cho Giáo viên qua Zalo.");
              }} className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 inline-flex items-center gap-2 text-sm shadow-xs transition-colors">
                <Copy className="w-4 h-4" /> Sao chép Kết quả gửi GV
              </button>
            </div>
          </div>
        )}
        
        {displayQuestions.map((q: any, idx: number) => (
          <StudentQuestionCard
            key={idx}
            idx={idx}
            q={q}
            examLanguage={examLanguage}
            isSubmitted={isSubmitted}
            answer={answers[idx]}
            onAnswerChange={handleAnswerChange}
            essayImages={essayImages[idx] || EMPTY_ESSAY_IMAGES}
            onImageUpload={handleImageUpload}
            onRemoveEssayImage={removeEssayImage}
            onPreviewImage={setPreviewingImage}
          />
        ))}

      </main>

      {/* Teacher Live Results Dashboard Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                    Báo cáo kết quả bài làm trực tiếp
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-xs font-mono font-bold">
                      {examId || selectedCode || "ONLINE"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {examTitle} • Đồng bộ realtime từ Máy chủ, Cloud KV & Google Sheets
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadTeacherSubmissions}
                  disabled={isTeacherLoading}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Làm mới dữ liệu từ server & Cloud KV"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTeacherLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isTeacherLoading ? "Đang tải..." : "Làm mới"}</span>
                </button>

                <button
                  onClick={exportTeacherExcel}
                  disabled={teacherSubmissions.length === 0}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Xuất kết quả bài làm ra file Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Xuất Excel</span>
                </button>

                <button
                  onClick={() => window.open(SYSTEM_EXAM_WEBHOOK, '_blank')}
                  className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs transition-colors cursor-pointer"
                  title="Xem Google Sheet"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowTeacherModal(false)}
                  className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-900/50">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">Tổng lượt nộp bài</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {teacherSubmissions.length} <span className="text-xs font-normal text-slate-400">học sinh</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">Điểm trung bình</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {teacherSubmissions.length > 0
                      ? (teacherSubmissions.reduce((acc, s) => acc + (Number(s.score ?? s.totalScore) || 0), 0) / teacherSubmissions.length).toFixed(1)
                      : "0.0"} <span className="text-xs font-normal text-slate-400">/ 10</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">Điểm Cao nhất / Thấp nhất</div>
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {teacherSubmissions.length > 0
                      ? `${Math.max(...teacherSubmissions.map(s => Number(s.score ?? s.totalScore) || 0)).toFixed(1)} / ${Math.min(...teacherSubmissions.map(s => Number(s.score ?? s.totalScore) || 0)).toFixed(1)}`
                      : "0 / 0"}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">Tỷ lệ Đạt (≥ 5.0)</div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {teacherSubmissions.length > 0
                      ? `${Math.round((teacherSubmissions.filter(s => (Number(s.score ?? s.totalScore) || 0) >= 5.0).length / teacherSubmissions.length) * 100)}%`
                      : "0%"}
                  </div>
                </div>
              </div>

              {/* Search & Table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={teacherSearchQuery}
                      onChange={(e) => setTeacherSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm theo tên học sinh hoặc lớp..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    Hiển thị {teacherSubmissions.filter(s => {
                      const q = teacherSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return String(s.studentName || '').toLowerCase().includes(q) || String(s.studentClass || '').toLowerCase().includes(q);
                    }).length} kết quả
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold">
                        <th className="py-2.5 px-3">STT</th>
                        <th className="py-2.5 px-3">Họ và tên</th>
                        <th className="py-2.5 px-3">Lớp</th>
                        <th className="py-2.5 px-3">Thời gian nộp</th>
                        <th className="py-2.5 px-3">Điểm số</th>
                        <th className="py-2.5 px-3">Số câu đúng</th>
                        <th className="py-2.5 px-3 text-center">Bài làm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {teacherSubmissions.filter(s => {
                        const q = teacherSearchQuery.toLowerCase().trim();
                        if (!q) return true;
                        return String(s.studentName || '').toLowerCase().includes(q) || String(s.studentClass || '').toLowerCase().includes(q);
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            {isTeacherLoading ? "Đang tải dữ liệu kết quả phòng thi..." : "Chưa có lượt nộp bài nào cho phòng thi này."}
                          </td>
                        </tr>
                      ) : (
                        teacherSubmissions
                          .filter(s => {
                            const q = teacherSearchQuery.toLowerCase().trim();
                            if (!q) return true;
                            return String(s.studentName || '').toLowerCase().includes(q) || String(s.studentClass || '').toLowerCase().includes(q);
                          })
                          .map((sub: any, idx: number) => {
                            const sc = Number(sub.score ?? sub.totalScore) || 0;
                            return (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                                <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                                  <div className="flex flex-col items-start gap-0.5">
                                    <span>{sub.studentName || sub.name || "Ẩn danh"}</span>
                                    {sub.isViolation && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300" title={sub.violationReason || "Rời tab thi"}>
                                        🚨 Rời tab thi (Tự nộp)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-semibold">
                                  {sub.studentClass || sub.className || "Mặc định"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                  {sub.timestamp ? new Date(sub.timestamp).toLocaleString('vi-VN') : (sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN') : "Vừa xong")}
                                </td>
                                <td className="py-2.5 px-3 font-bold">
                                  <span className={`px-2 py-0.5 rounded-full ${sc >= 8.0 ? 'bg-emerald-100 text-emerald-800' : sc >= 5.0 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {sc.toFixed(1)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                  {sub.correctCount ?? sub.correct ?? 0} / {sub.totalQuestions || displayQuestions.length}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => setSelectedSubDetail(sub)}
                                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Xem chi tiết</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Detailed Answer Drawer Modal */}
      {selectedSubDetail && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  Chi tiết bài làm: {selectedSubDetail.studentName || "Học sinh"} ({selectedSubDetail.studentClass || "Lớp"})
                </h4>
                <p className="text-xs text-slate-500">
                  Điểm: <strong className="text-emerald-600">{Number(selectedSubDetail.score ?? selectedSubDetail.totalScore).toFixed(1)}/10</strong> • Làm trong: {selectedSubDetail.timeSpent || "N/A"}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {(() => {
                let parsedAns: any[] = [];
                try {
                  if (typeof selectedSubDetail.detailedAnswers === 'string') {
                    parsedAns = JSON.parse(selectedSubDetail.detailedAnswers);
                  } else if (Array.isArray(selectedSubDetail.detailedAnswers)) {
                    parsedAns = selectedSubDetail.detailedAnswers;
                  } else if (Array.isArray(selectedSubDetail.details)) {
                    parsedAns = selectedSubDetail.details;
                  }
                } catch(e) {}

                if (parsedAns.length === 0) {
                  return <div className="text-slate-400 text-center py-6">Không tìm thấy chi tiết từng câu của học sinh này.</div>;
                }

                return parsedAns.map((item: any, i: number) => (
                  <div key={i} className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${item.isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 dark:text-white">Câu {item.questionIndex || item.questionNumber || (i + 1)}:</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${item.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {item.isCorrect ? "Đúng ✓" : "Sai ✗"}
                      </span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300">
                      <MathView content={item.questionContent || item.questionText || ''} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                      <div>Học sinh chọn: <strong className={item.isCorrect ? "text-emerald-700" : "text-rose-700"}>{String(item.studentAnswer || item.studentChoice || 'Bỏ trống')}</strong></div>
                      <div>Đáp án đúng: <strong className="text-emerald-700">{String(item.correctAnswer || item.correctChoice || 'N/A')}</strong></div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Floating Calculator Button and Modal */}
      <button
        onClick={() => setShowCalculator(!showCalculator)}
        className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white hover:bg-slate-805 hover:scale-105 active:scale-95 p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all border border-slate-750"
        title="Mở Máy tính Khoa học Casio"
      >
        <Calculator className="w-6 h-6 text-emerald-400" />
      </button>

      {showCalculator && (
        <ScientificCalculatorModal onClose={() => setShowCalculator(false)} />
      )}

      {/* Image Preview Lightbox Modal */}
      {previewingImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 overflow-hidden shadow-2xl flex flex-col items-center">
            <button 
              onClick={() => setPreviewingImage(null)}
              className="absolute top-3 right-3 z-10 p-2 bg-slate-800/80 hover:bg-slate-900 text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewingImage} 
              alt="Xem trước bài làm" 
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Anti-Cheat Violation Auto-Submit Modal */}
      {showViolationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-rose-500 text-center p-6 space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-black uppercase tracking-wider">
                Vi phạm quy chế phòng thi
              </span>
              <h3 className="text-xl font-black text-rose-700 mt-2">
                BÀI THI ĐÃ BỊ TỰ ĐỘNG THU & NỘP!
              </h3>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 text-left text-xs space-y-2 text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
              <p>
                <strong>Lý do vi phạm:</strong> {violationReasonText || "Học sinh đã thoát/chuyển khỏi tab làm bài thi online."}
              </p>
              <p>
                <strong>Quy chế:</strong> Phòng thi được giáo viên thiết lập chế độ giám sát chống chuyển tab tra cứu đáp án. Khi học sinh rời khỏi tab thi, hệ thống sẽ tự động thu bài và nộp kết quả ngay lập tức.
              </p>
              <p className="text-rose-700 dark:text-rose-400 text-[11px] italic">
                * Điểm số các câu hỏi đã làm tính đến thời điểm vi phạm đã được ghi nhận và gửi về cho Thầy/Cô kèm biên bản vi phạm.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowViolationModal(false);
              }}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase cursor-pointer shadow-md transition-colors"
            >
              Xem chi tiết kết quả đã nộp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentExamView;

