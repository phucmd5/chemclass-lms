"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { getClassDetails, addStudentToClass, removeStudentFromClass } from "@/app/actions/classes";
import { createSchedule, deleteSchedule } from "@/app/actions/schedules";
import {
  Users,
  Calendar,
  Video,
  UserPlus,
  Plus,
  Trash2,
  ArrowLeft,
  GraduationCap,
  Clock,
  Key,
  Phone,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const classId = resolvedParams.id;

  const [clsData, setClsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"students" | "schedules">("students");

  // State cho Modal thêm học sinh (Phương án A)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // State cho Modal thêm buổi học
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const data = await getClassDetails(classId);
    setClsData(data);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [classId]);

  async function handleAddStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddingStudent(true);
    setStudentError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("classId", classId);

    const res = await addStudentToClass(formData);
    setAddingStudent(false);

    if (res.error) {
      setStudentError(res.error);
    } else {
      setShowAddStudentModal(false);
      loadData();
    }
  }

  async function handleAddSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddingSchedule(true);
    setScheduleError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("classId", classId);

    const res = await createSchedule(formData);
    setAddingSchedule(false);

    if (res.error) {
      setScheduleError(res.error);
    } else {
      setShowAddScheduleModal(false);
      loadData();
    }
  }

  async function handleRemoveStudent(membershipId: string) {
    if (!confirm("Bạn có chắc chắn muốn xoá học sinh này khỏi lớp?")) return;
    await removeStudentFromClass(membershipId, classId);
    loadData();
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm("Bạn có chắc chắn muốn xoá buổi học này?")) return;
    await deleteSchedule(scheduleId, classId);
    loadData();
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm">Đang tải thông tin lớp học...</p>
      </div>
    );
  }

  if (!clsData) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Không tìm thấy lớp học.</p>
        <Link href="/dashboard/classes" className="text-indigo-400 underline mt-2 inline-block">
          Quay lại danh sách lớp
        </Link>
      </div>
    );
  }

  // Tự động gợi ý mã học sinh tiếp theo (Ví dụ HS01, HS02...)
  const nextStudentCode = `HS${String(clsData.students.length + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/classes"
            className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Khối {clsData.grade}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white">{clsData.name}</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sĩ số: <strong className="text-cyan-300">{clsData.students.length} học sinh</strong> • Học phí:{" "}
              <strong className="text-emerald-400">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(clsData.monthly_fee || 0)}/tháng
              </strong>
            </p>
          </div>
        </div>

        {/* Google Meet Link Header */}
        {clsData.meet_link && (
          <a
            href={clsData.meet_link.startsWith("http") ? clsData.meet_link : `https://${clsData.meet_link}`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2 transition-all self-start sm:self-auto"
          >
            <Video className="w-4 h-4" />
            <span>Mở Google Meet của Lớp</span>
          </a>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 space-x-4">
        <button
          onClick={() => setActiveTab("students")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "students"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh sách Học sinh ({clsData.students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("schedules")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "schedules"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Thời khóa biểu / Buổi học ({clsData.schedules.length})</span>
        </button>
      </div>

      {/* TAB 1: Danh sách Học sinh (Phương án A) */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              💡 Học sinh đăng nhập bằng <strong>Mã Học Sinh</strong> và Mật khẩu mặc định do bạn cấp.
            </p>
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm học sinh mới</span>
            </button>
          </div>

          {clsData.students.length === 0 ? (
            <div className="p-10 rounded-2xl bg-slate-900/40 border border-white/5 text-center space-y-3">
              <p className="text-sm text-slate-400">Lớp chưa có học sinh nào.</p>
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="text-xs text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm học sinh đầu tiên (Cấp mã HS & Mật khẩu)
              </button>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 uppercase text-[11px] font-semibold text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="px-5 py-3.5">Mã Học Sinh</th>
                      <th className="px-5 py-3.5">Họ và Tên</th>
                      <th className="px-5 py-3.5">Số điện thoại / Zalo</th>
                      <th className="px-5 py-3.5">Ngày vào lớp</th>
                      <th className="px-5 py-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {clsData.students.map((st: any) => (
                      <tr key={st.membershipId} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-cyan-300">
                          {st.profile?.student_code || "---"}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-white">
                          {st.profile?.full_name || "Chưa cập nhật"}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400">
                          {st.profile?.phone || "---"}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400">
                          {new Date(st.joinedAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleRemoveStudent(st.membershipId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Xóa khỏi lớp"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Thời khóa biểu của lớp */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Lịch học sẽ hiển thị trực tiếp trên giao diện Học sinh kèm nút vào Google Meet.
            </p>
            <button
              onClick={() => setShowAddScheduleModal(true)}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo buổi học mới</span>
            </button>
          </div>

          {clsData.schedules.length === 0 ? (
            <div className="p-10 rounded-2xl bg-slate-900/40 border border-white/5 text-center space-y-3">
              <p className="text-sm text-slate-400">Lớp chưa có buổi học nào.</p>
              <button
                onClick={() => setShowAddScheduleModal(true)}
                className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Lên lịch buổi học đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clsData.schedules.map((sch: any) => {
                const meetUrl = sch.custom_meet_link || clsData.meet_link;
                const start = new Date(sch.start_time);
                const end = new Date(sch.end_time);

                return (
                  <div
                    key={sch.id}
                    className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-white text-sm">{sch.title}</h4>
                        <button
                          onClick={() => handleDeleteSchedule(sch.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                          title="Xóa buổi học"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-cyan-300 mb-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {start.toLocaleDateString("vi-VN")} | {start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {sch.note && (
                        <p className="text-xs text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-white/5">
                          {sch.note}
                        </p>
                      )}
                    </div>

                    {meetUrl && (
                      <a
                        href={meetUrl.startsWith("http") ? meetUrl : `https://${meetUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Google Meet</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Thêm học sinh (Phương án A) */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                Cấp Tài Khoản Học Sinh Mới
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tự động tạo tài khoản đăng nhập cho học sinh (Phương án A)
              </p>
            </div>

            {studentError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{studentError}</span>
              </div>
            )}

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Họ và tên Học sinh *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="Ví dụ: Nguyễn Minh Hiếu"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Mã Học Sinh *
                  </label>
                  <input
                    type="text"
                    name="studentCode"
                    required
                    defaultValue={nextStudentCode}
                    placeholder="HS01"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-cyan-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Mật khẩu khởi tạo
                  </label>
                  <input
                    type="text"
                    name="password"
                    defaultValue="123456"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Số điện thoại / Zalo phụ huynh
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="0912 345 678"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addingStudent}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {addingStudent && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Thêm Vào Lớp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm buổi học mới */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                Lên Lịch Buổi Học Mới
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Lịch học cho lớp {clsData.name}
              </p>
            </div>

            {scheduleError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{scheduleError}</span>
              </div>
            )}

            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tiêu đề Buổi học *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Ví dụ: Buổi 1: Este & Phản ứng Xà phòng hoá"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Thời gian Bắt đầu *
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
                    Thời gian Kết thúc *
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
                  placeholder={clsData.meet_link || "https://meet.google.com/..."}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Để trống nếu muốn dùng chung link Meet cố định của lớp.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Dặn dò / Chuẩn bị bài
                </label>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Học sinh xem trước SGK trang 15, chuẩn bị vở bài tập..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addingSchedule}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {addingSchedule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lên Lịch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
