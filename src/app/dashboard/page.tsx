export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTeacherClasses } from "@/app/actions/classes";
import { getTeacherSchedules } from "@/app/actions/schedules";
import { getCurrentProfile } from "@/app/actions/auth";
import {
  Users,
  Calendar,
  Sparkles,
  ArrowRight,
  Video,
  PlusCircle,
  Clock,
  GraduationCap,
} from "lucide-react";

export default async function TeacherDashboardPage() {
  const profile = await getCurrentProfile();
  const classes = await getTeacherClasses();
  const schedules = await getTeacherSchedules();

  const totalStudents = classes.reduce((acc, c) => acc + (c.studentCount || 0), 0);
  const upcomingSchedules = schedules.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-cyan-900/40 border border-white/10 backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chào mừng trở lại</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Xin chào, {profile?.full_name || "Thầy/Cô"}!
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Hôm nay bạn đang quản lý <strong className="text-indigo-300">{classes.length} lớp học</strong> với tổng cộng{" "}
            <strong className="text-cyan-300">{totalStudents} học sinh</strong>. Hãy tạo buổi học mới hoặc soạn đề thi trắc nghiệm bằng AI!
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/dashboard/classes"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo lớp học mới</span>
            </Link>
            <Link
              href="/dashboard/exams"
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-white text-sm font-semibold flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Soạn đề thi AI</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng số Lớp</span>
            <GraduationCap className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-white">{classes.length}</div>
          <p className="text-xs text-slate-400 mt-1">Đang hoạt động</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng Học sinh</span>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white">{totalStudents}</div>
          <p className="text-xs text-slate-400 mt-1">Đã tham gia vào các lớp</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Lịch dạy sắp tới</span>
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white">{schedules.length}</div>
          <p className="text-xs text-slate-400 mt-1">Buổi học trong danh sách</p>
        </div>
      </div>

      {/* Main Grid: Upcoming Classes & Active Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Upcoming Schedules */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Lịch Dạy Sắp Tới
            </h2>
            <Link
              href="/dashboard/schedules"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              Xem tất cả
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingSchedules.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-slate-400">
              <p className="text-sm">Chưa có buổi học nào được lên lịch.</p>
              <Link
                href="/dashboard/schedules"
                className="mt-3 inline-block text-xs text-indigo-400 hover:underline"
              >
                + Thêm buổi học ngay
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSchedules.map((sch: any) => {
                const meetUrl = sch.custom_meet_link || sch.classes?.meet_link;
                const startDate = new Date(sch.start_time);
                const endDate = new Date(sch.end_time);

                return (
                  <div
                    key={sch.id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {sch.classes?.name || "Lớp học"}
                        </span>
                        <h3 className="font-semibold text-white text-sm">{sch.title}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {endDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span>•</span>
                        <span>{startDate.toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>

                    {meetUrl && (
                      <a
                        href={meetUrl.startsWith("http") ? meetUrl : `https://${meetUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Mở Google Meet</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Classes List Summary */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-cyan-400" />
              Lớp Đang Phụ Trách
            </h2>
            <Link
              href="/dashboard/classes"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              Quản lý
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {classes.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-slate-400">
              <p className="text-sm">Bạn chưa tạo lớp học nào.</p>
              <Link
                href="/dashboard/classes"
                className="mt-3 inline-block text-xs text-cyan-400 hover:underline"
              >
                + Bấm vào đây để tạo lớp đầu tiên
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {classes.slice(0, 4).map((cls) => (
                <Link
                  key={cls.id}
                  href={`/dashboard/classes/${cls.id}`}
                  className="block p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-white text-sm group-hover:text-cyan-300 transition-colors">
                      {cls.name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/5">
                      Khối {cls.grade}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{cls.studentCount} Học sinh</span>
                    {cls.monthly_fee > 0 && (
                      <span className="text-emerald-400 font-medium">
                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(cls.monthly_fee)}/tháng
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
