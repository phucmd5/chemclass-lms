"use client";

import { useState } from "react";
import Link from "next/link";
import { loginUser } from "@/app/actions/auth";
import { FlaskConical, GraduationCap, User, Lock, ArrowRight, Sparkles, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [roleTab, setRoleTab] = useState<"teacher" | "student">("teacher");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await loginUser(formData);
      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
      }
    } catch {
      // Redirect throws an expected error in Next.js Server Actions
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <Link href="/" className="flex items-center gap-3 mb-8 group">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
          <FlaskConical className="w-6 h-6 text-white" />
        </div>
        <div className="text-left">
          <h1 className="text-2xl font-bold text-white tracking-tight">ChemClass LMS</h1>
          <p className="text-xs text-indigo-300 font-medium">Hệ thống Quản lý Dạy học Hoá học</p>
        </div>
      </Link>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50">
        {/* Role Toggle Tabs */}
        <div className="flex rounded-2xl bg-slate-950/60 p-1.5 border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => {
              setRoleTab("teacher");
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              roleTab === "teacher"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Giáo viên
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleTab("student");
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              roleTab === "student"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            Học sinh
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              {roleTab === "teacher" ? "Email Giáo viên" : "Mã Học Sinh (hoặc Email)"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type={roleTab === "teacher" ? "email" : "text"}
                name="identifier"
                required
                placeholder={
                  roleTab === "teacher" ? "thaygiao@gmail.com" : "Ví dụ: HS01 hoặc HS002"
                }
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
              />
            </div>
            {roleTab === "student" && (
              <p className="text-xs text-slate-400 mt-1.5">
                💡 Mã học sinh do giáo viên cấp (Ví dụ: <span className="text-cyan-300 font-mono">HS01</span>).
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
              />
            </div>
            {roleTab === "student" && (
              <p className="text-xs text-slate-400 mt-1.5">
                Mật khẩu mặc định thường là: <span className="text-cyan-300 font-mono">123456</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-semibold text-white shadow-xl flex items-center justify-center gap-2 transition-all ${
              roleTab === "teacher"
                ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
                : "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập {roleTab === "teacher" ? "Giáo viên" : "Học sinh"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info for Teacher registration */}
        {roleTab === "teacher" && (
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-slate-400">
              Chưa có tài khoản giáo viên?{" "}
              <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
