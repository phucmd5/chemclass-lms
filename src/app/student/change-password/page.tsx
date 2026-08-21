"use client";

import { useState } from "react";
import { changeStudentPassword } from "@/app/actions/student-auth";
import { FlaskConical, KeyRound, Lock, ArrowRight, AlertCircle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

export default function StudentChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await changeStudentPassword(formData);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <FlaskConical className="w-6 h-6 text-white" />
        </div>
        <div className="text-left">
          <h1 className="text-2xl font-bold text-white tracking-tight">ChemClass LMS</h1>
          <p className="text-xs text-cyan-300 font-medium">Bảo Mật Tài Khoản Học Sinh</p>
        </div>
      </div>

      <div className="w-full max-w-md bg-slate-900/80 border border-cyan-500/30 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/50">
        <div className="text-center mb-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Đổi Mật Khẩu Bắt Buộc</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Bạn đang đăng nhập bằng mật khẩu mặc định. Để bảo vệ tài khoản và kết quả thi của bạn, vui lòng tạo mật khẩu mới!
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
            <span>Đổi mật khẩu thành công! Đang chuyển vào trang học tập...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Mật khẩu mới *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                name="newPassword"
                required
                minLength={6}
                placeholder="Tối thiểu 6 ký tự (khác 123456)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Xác nhận mật khẩu mới *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full mt-2 py-3.5 rounded-xl font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-xl shadow-cyan-400/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang cập nhật mật khẩu...</span>
              </>
            ) : (
              <>
                <span>Lưu Mật Khẩu & Bắt Đầu Học</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
