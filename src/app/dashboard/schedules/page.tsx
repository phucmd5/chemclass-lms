"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTeacherSchedules, createSchedule, deleteSchedule } from "@/app/actions/schedules";
import { getTeacherClasses } from "@/app/actions/classes";
import {
  Calendar,
  Plus,
  Video,
  Clock,
  Trash2,
  GraduationCap,
  Sparkles,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";

export default function MasterSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [schData, clsData] = await Promise.all([
      getTeacherSchedules(),
      getTeacherClasses(),
    ]);
    setSchedules(schData);
    setClasses(clsData);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await createSchedule(formData);
    setCreating(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setShowModal(false);
      loadData();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc muốn xoá buổi học này?")) return;
    await deleteSchedule(id);
    loadData();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-cyan-400" />
            Thời Khóa Biểu & Lịch Dạy
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tổng hợp tất cả các buổi học và link phòng Google Meet trực tuyến
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Lên lịch buổi học mới</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-3" />
          <p className="text-sm">Đang tải lịch học...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-white/5 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Chưa có lịch dạy</h3>
          <p className="text-sm text-slate-400">
            Hãy lên lịch buổi học tiếp theo cho các lớp của bạn.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/30 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo buổi học ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {schedules.map((sch) => {
            const meetUrl = sch.custom_meet_link || sch.classes?.meet_link;
            const start = new Date(sch.start_time);
            const end = new Date(sch.end_time);
            const isToday = new Date().toDateString() === start.toDateString();

            return (
              <div
                key={sch.id}
                className={`p-5 rounded-3xl bg-slate-900/60 border backdrop-blur-xl transition-all flex flex-col justify-between space-y-4 ${
                  isToday
                    ? "border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {sch.classes?.name || "Lớp"}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          HÔM NAY
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(sch.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                      title="Xóa buổi học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-bold text-white text-base">{sch.title}</h3>

                  <div className="flex items-center gap-2 text-xs text-cyan-300 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                    <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{start.toLocaleDateString("vi-VN")}</p>
                      <p className="text-[11px] text-slate-400">
                        {start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  {sch.note && (
                    <p className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                      {sch.note}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-white/5">
                  {meetUrl ? (
                    <a
                      href={meetUrl.startsWith("http") ? meetUrl : `https://${meetUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Video className="w-4 h-4" />
                      <span>Vào Google Meet</span>
                    </a>
                  ) : (
                    <span className="block text-center text-xs text-slate-500 italic py-1">
                      Chưa có link Meet
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Lên Lịch */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                Lên Lịch Buổi Học Mới
              </h3>
              <p className="text-xs text-slate-400 mt-1">Chọn lớp và đặt thời gian học</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Chọn Lớp Học *
                </label>
                <select
                  name="classId"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Khối {c.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tiêu đề Buổi học *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Ví dụ: Chuyên đề Cacbohidrat & Phản ứng tráng gương"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Bắt đầu *
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Kết thúc *
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Link Google Meet Riêng (Tùy chọn)
                </label>
                <input
                  type="text"
                  name="customMeetLink"
                  placeholder="https://meet.google.com/..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Ghi chú / Dặn dò
                </label>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Nội dung bài tập hoặc chuẩn bị tài liệu..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lên Lịch Ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
