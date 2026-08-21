"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  changeStudentPasswordFirstTime,
  changeStudentPasswordVoluntary,
  getStudentPasswordStatus,
} from "@/app/actions/student-auth";
import {
  FlaskConical,
  KeyRound,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";

export default function StudentChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      const res = await getStudentPasswordStatus();
      setIsFirstTime(res.isFirstTime);
      setProfile(res.profile);
      setFetchingStatus(false);
    }
    checkStatus();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    let res;

    if (isFirstTime) {
      res = await changeStudentPasswordFirstTime(formData);
    } else {
      res = await changeStudentPasswordVoluntary(formData);
    }

    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/student";
      }, 1200);
    }
  }

  if (fetchingStatus) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm">Đang kiểm tra thông tin tài khoản...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <FlaskConical className="w-6 h-6 text-white" />
        </div>
        <div className="text-left">
          <h1 className="text-2xl font-bold text-white tracking-tight">ChemClass LMS</h1>
          <p className="text-xs text-cyan-300 font-medium">Bảo Mật Tài Khoản Học Sinh</p>
        </div>
      </div>

      <div className="w-full max-w-md bg-slate-900/85 border border-cyan-500/30 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/50 relative">
        {/* Nút quay lại nếu là học sinh tự nguyện đổi mật khẩu */}
        {!isFirstTime && (
          <Link
            href="/student"
            className="absolute top-6 left-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </Link>
        )}

        <div className="text-center mb-6 space-y-2 mt-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white">
            {isFirstTime ? "Đổi Mật Khẩu Lần Đầu Đăng Nhập" : "Thay Đổi Mật Khẩu"}
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            {isFirstTime ? (
              <>
                Chào bạn <strong className="text-cyan-300">{profile?.full_name || ""}</strong> (Mã:{" "}
                <span className="font-mono text-indigo-300 font-bold">{profile?.student_code || ""}</span>). Bạn vừa đăng nhập bằng mật khẩu mặc định. Vui lòng tạo mật khẩu mới để bắt đầu học tập!
              </>
            ) : (
              "Vui lòng nhập mật khẩu hiện tại để xác thực và thiết lập mật khẩu mới cho tài khoản."
            )}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Đổi mật khẩu thành công! Đang chuyển vào Cổng Học Sinh...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mục mật khẩu hiện tại (CHỈ HIỆN KHI ĐÃ ĐĂNG NHẬP THÀNH CÔNG VÀ ĐỔI TỰ NGUYỆN) */}
          {!isFirstTime && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Mật khẩu hiện tại *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showCurrentPass ? "text" : "password"}
                  name="currentPassword"
                  required
                  placeholder="Nhập mật khẩu bạn đang dùng"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Mật khẩu mới */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Mật khẩu mới *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showNewPass ? "text" : "password"}
                name="newPassword"
                required
                minLength={6}
                placeholder={isFirstTime ? "Tối thiểu 6 ký tự (khác 123456)" : "Tối thiểu 6 ký tự"}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Xác nhận mật khẩu mới *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirmPass ? "text" : "password"}
                name="confirmPassword"
                required
                minLength={6}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full mt-3 py-3.5 rounded-xl font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-xl shadow-cyan-400/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang cập nhật mật khẩu...</span>
              </>
            ) : (
              <>
                <span>{isFirstTime ? "Lưu Mật Khẩu & Bắt Đầu Học" : "Cập Nhật Mật Khẩu"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
