"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTeacherClasses, createClass } from "@/app/actions/classes";
import {
  Users,
  Plus,
  Video,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Loader2,
  X,
  CreditCard,
} from "lucide-react";

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadClasses() {
    setLoading(true);
    const data = await getTeacherClasses();
    setClasses(data);
    setLoading(false);
  }

  useEffect(() => {
    loadClasses();
  }, []);

  async function handleCreateClass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await createClass(formData);

    setCreating(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setShowModal(false);
      loadClasses();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Quản Lý Lớp Học & Học Sinh
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tạo lớp mới, quản lý danh sách học sinh và cấp tài khoản tự động
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo lớp học mới</span>
        </button>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-sm">Đang tải danh sách lớp...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-white/5 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Chưa có lớp học nào</h3>
          <p className="text-sm text-slate-400">
            Hãy tạo lớp học đầu tiên của bạn (ví dụ: Hoá 12 - Luyện Thi THPT QG) để bắt đầu thêm học sinh.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo lớp học ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/50 backdrop-blur-xl transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Khối {cls.grade}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-2 group-hover:text-indigo-300 transition-colors">
                      {cls.name}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 border border-white/5 flex-shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                </div>

                {cls.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {cls.description}
                  </p>
                )}

                <div className="pt-2 border-t border-white/5 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Sĩ số:
                    </span>
                    <span className="font-semibold text-cyan-300">{cls.studentCount} học sinh</span>
                  </div>

                  {cls.monthly_fee > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" /> Học phí:
                      </span>
                      <span className="font-semibold text-emerald-400">
                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(cls.monthly_fee)}/tháng
                      </span>
                    </div>
                  )}

                  {cls.meet_link && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5" /> Google Meet:
                      </span>
                      <a
                        href={cls.meet_link.startsWith("http") ? cls.meet_link : `https://${cls.meet_link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline truncate max-w-[150px]"
                      >
                        {cls.meet_link}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <Link
                  href={`/dashboard/classes/${cls.id}`}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Xem chi tiết & Học sinh</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Tạo lớp mới */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Tạo Lớp Học Mới
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Điền thông tin lớp để lên lịch và quản lý học sinh
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tên Lớp Học *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Ví dụ: Hoá 12 - Luyện Thi Đại Học VIP"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Khối Lớp *
                  </label>
                  <select
                    name="grade"
                    required
                    defaultValue="12"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                    <option value="Khác">Luyện thi ĐH / Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Học phí / Tháng (VNĐ)
                  </label>
                  <input
                    type="number"
                    name="monthlyFee"
                    placeholder="500000"
                    defaultValue="500000"
                    step="10000"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Link Google Meet Cố Định
                </label>
                <input
                  type="text"
                  name="meetLink"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Link phòng học Google Meet cố định cho học sinh của lớp này.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Mô tả / Ghi chú về lớp
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Mục tiêu điểm số, thời gian học dự kiến..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Tạo Lớp Học</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
