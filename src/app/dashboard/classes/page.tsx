"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTeacherClasses, createClass, deleteClass, updateClass } from "@/app/actions/classes";
import { GRADE_OPTIONS } from "@/lib/constants";
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
  Trash2,
  Edit,
} from "lucide-react";

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Tạo lớp
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Sửa lớp
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  async function handleUpdateClass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingClass) return;

    setUpdating(true);
    setEditError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("classId", editingClass.id);

    const res = await updateClass(formData);
    setUpdating(false);

    if (res.error) {
      setEditError(res.error);
    } else {
      setEditingClass(null);
      loadClasses();
    }
  }

  async function handleDeleteClass(id: string, name: string) {
    if (!confirm(`Bạn có chắc chắn muốn xóa lớp "${name}" không?`)) return;

    const res = await deleteClass(id);
    if (res.error) {
      alert(res.error);
    } else {
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
            Quản Lý Lớp Học THCS & Học Sinh
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tạo lớp học Khối 6, 7, 8, 9 (Cấp THCS), chỉnh sửa và quản lý danh sách học sinh
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
            Hãy tạo lớp học đầu tiên của bạn (ví dụ: KHTN 8A1, Hoá 9 - Luyện Thi Chuyên) để bắt đầu thêm học sinh.
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

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingClass(cls)}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-all"
                      title="Sửa thông tin lớp"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls.id, cls.name)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Xóa lớp học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                Tạo Lớp Học THCS Mới
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Điền thông tin lớp để lên lịch và quản lý học sinh cấp 2 (Khối 6-9)
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
                  placeholder="Ví dụ: KHTN 8A1 hoặc Hoá 9 - Luyện Thi Chuyên"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Khối Lớp THCS *
                  </label>
                  <select
                    name="grade"
                    required
                    defaultValue="8"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
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
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Mô tả / Ghi chú về lớp
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Mục tiêu bồi dưỡng, lịch học dự kiến..."
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

      {/* Modal: Sửa lớp */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setEditingClass(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-400" />
                Sửa Thông Tin Lớp Học
              </h2>
              <p className="text-xs text-slate-400 mt-1">Cập nhật lớp {editingClass.name}</p>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tên Lớp Học *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingClass.name}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Khối Lớp THCS *
                  </label>
                  <select
                    name="grade"
                    required
                    defaultValue={editingClass.grade}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Học phí / Tháng (VNĐ)
                  </label>
                  <input
                    type="number"
                    name="monthlyFee"
                    defaultValue={editingClass.monthly_fee || 500000}
                    step="10000"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
                  defaultValue={editingClass.meet_link || ""}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Mô tả / Ghi chú
                </label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingClass.description || ""}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
