import React, { useState } from "react";
import { 
  ShieldCheck, Lock, Unlock, Eye, EyeOff, AlertCircle, 
  HelpCircle, GraduationCap, ArrowRight, RefreshCw, KeyRound, CheckCircle2 
} from "lucide-react";
import { 
  getSecuritySettings, 
  verifyAndUnlockTeacher, 
  emergencyResetPasscode 
} from "../lib/appSecurity";

interface TeacherLockScreenProps {
  onUnlockSuccess: () => void;
  onStudentModeClick?: () => void;
}

export function TeacherLockScreen({ onUnlockSuccess, onStudentModeClick }: TeacherLockScreenProps) {
  const [pin, setPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // Student quick exam PIN input
  const [studentExamPin, setStudentExamPin] = useState("");

  const settings = getSecuritySettings();

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      setErrorMsg("Vui lòng nhập mã PIN hoặc mật khẩu bảo vệ");
      return;
    }

    const ok = verifyAndUnlockTeacher(pin);
    if (ok) {
      setErrorMsg("");
      onUnlockSuccess();
    } else {
      setErrorMsg("Mã PIN không chính xác. Vui lòng thử lại!");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleEmergencyReset = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = emergencyResetPasscode(recoveryEmail);
    if (ok) {
      setRecoverySuccess(true);
      setTimeout(() => {
        setShowRecoveryModal(false);
        setRecoverySuccess(false);
        onUnlockSuccess();
      }, 1500);
    } else {
      setRecoveryError("Email xác thực không khớp với tài khoản Giáo viên sở hữu ứng dụng.");
    }
  };

  const handleGoToStudentExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentExamPin.trim()) return;
    const cleanPin = studentExamPin.trim().toUpperCase();
    window.location.href = `/?pin=${cleanPin}`;
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-slate-100">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Lock Card */}
      <div className={`w-full max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10 transition-transform ${isShaking ? 'animate-shake' : ''}`}>
        
        {/* Brand & Security Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-3 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            EduPlan AI Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            Không gian làm việc Giáo viên được khóa bảo vệ
          </p>
        </div>

        {/* PIN Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Mã PIN / Mật khẩu Giáo viên
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoFocus
                placeholder="Nhập mã PIN đã đặt..."
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                className="w-full pl-10 pr-10 py-3 bg-slate-900/90 border border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-white text-base tracking-widest placeholder:tracking-normal placeholder:text-slate-500 transition-all outline-none"
              />
              <KeyRound className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <p className="mt-2 text-xs font-medium text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>Mở khóa Không gian Giáo viên</span>
          </button>
        </form>

        {/* Hints & Emergency Recovery */}
        <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
          {settings.hint ? (
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showHint ? `Gợi ý: ${settings.hint}` : "Xem gợi ý PIN"}</span>
            </button>
          ) : <span />}

          <button
            type="button"
            onClick={() => setShowRecoveryModal(true)}
            className="hover:text-amber-400 transition-colors cursor-pointer text-slate-400 underline decoration-slate-600 underline-offset-2"
          >
            Quên mã PIN?
          </button>
        </div>

        {/* Student Quick Access Section */}
        <div className="mt-6 pt-5 border-t border-slate-700/80 bg-slate-900/50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-5 rounded-b-2xl">
          <div className="flex items-center gap-2 text-indigo-300 font-medium text-xs mb-2">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>Bạn là Học sinh vào làm bài kiểm tra?</span>
          </div>
          <form onSubmit={handleGoToStudentExam} className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập mã PIN phòng thi (ví dụ: MAT-882)..."
              value={studentExamPin}
              onChange={(e) => setStudentExamPin(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white uppercase placeholder:normal-case placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!studentExamPin.trim()}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>Vào thi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Học sinh có thể click trực tiếp link thi giáo viên gửi để làm bài mà không cần mã PIN ứng dụng.
          </p>
        </div>
      </div>

      {/* Emergency Passcode Reset Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <KeyRound className="w-6 h-6" />
              <h3 className="font-bold text-lg text-white">Khôi phục Mã PIN Giáo viên</h3>
            </div>
            
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Để đảm bảo an toàn, vui lòng nhập chính xác email Giáo viên quản trị đã cấu hình để mở khóa khẩn cấp và đặt lại mã PIN.
            </p>

            {recoverySuccess ? (
              <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Mở khóa thành công! Đang chuyển hướng vào hệ thống...</span>
              </div>
            ) : (
              <form onSubmit={handleEmergencyReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Email Quản trị viên / Giáo viên:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ví dụ: DactuanDHSP@gmail.com"
                    value={recoveryEmail}
                    onChange={(e) => {
                      setRecoveryEmail(e.target.value);
                      setRecoveryError("");
                    }}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  {recoveryError && (
                    <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {recoveryError}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecoveryModal(false);
                      setRecoveryError("");
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-medium transition-colors shadow-md flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Xác nhận & Khôi phục</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
