export const dynamic = "force-dynamic";

import Link from "next/link";
import { getStudentDashboardData } from "@/app/actions/schedules";
import { logoutUser } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  FlaskConical,
  GraduationCap,
  Calendar,
  Video,
  Sparkles,
  CreditCard,
  LogOut,
  Clock,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

export default async function StudentPortalPage() {
  const data = await getStudentDashboardData();

  if (!data || !data.profile) {
    redirect("/login");
  }

  const { profile, classes, upcomingSchedules } = data;

  // Kiểm tra cờ must_change_password trong user_metadata
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.user_metadata?.must_change_password !== false) {
    redirect("/student/change-password");
  }

  const nextSession = upcomingSchedules[0] || null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* Student Top Header */}
      <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-slate-950/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base text-white">ChemClass</span>
              <span className="block text-[11px] text-cyan-400 font-medium">Cổng Học Sinh</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs">
              <span className="text-slate-400">Mã HS:</span>
              <span className="font-mono font-bold text-cyan-300">{profile.student_code}</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/student/change-password"
                title="Đổi mật khẩu"
                className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-all border border-white/5 flex items-center gap-1.5 text-xs font-medium"
              >
                <KeyRound className="w-4 h-4" />
                <span className="hidden sm:inline">Đổi MK</span>
              </Link>

              <span className="text-xs font-semibold text-white hidden sm:inline-block">
                {profile.full_name}
              </span>

              <form action={logoutUser}>
                <button
                  type="submit"
                  title="Đăng xuất"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-white/5"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Next Session Spotlight Banner */}
        {nextSession ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-cyan-900/50 via-slate-900 to-indigo-900/50 border border-cyan-500/30 backdrop-blur-xl relative overflow-hidden shadow-2xl shadow-cyan-950/50">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30">
                  <Clock className="w-3.5 h-3.5" />
                  <span>BUỔI HỌC TIẾP THEO</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">{nextSession.title}</h2>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="font-semibold text-indigo-300">
                    Lớp: {nextSession.classes?.name}
                  </span>
                  <span>•</span>
                  <span>{new Date(nextSession.start_time).toLocaleDateString("vi-VN")}</span>
                  <span>•</span>
                  <span>
                    {new Date(nextSession.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {nextSession.note && (
                  <p className="text-xs text-slate-400 pt-1">
                    📝 <strong>Dặn dò:</strong> {nextSession.note}
                  </p>
                )}
              </div>

              {(nextSession.custom_meet_link || nextSession.classes?.meet_link) && (
                <a
                  href={
                    (nextSession.custom_meet_link || nextSession.classes?.meet_link).startsWith("http")
                      ? nextSession.custom_meet_link || nextSession.classes?.meet_link
                      : `https://${nextSession.custom_meet_link || nextSession.classes?.meet_link}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2.5 transition-all self-start md:self-auto hover:scale-105 active:scale-95"
                >
                  <Video className="w-5 h-5 text-slate-950" />
                  <span>VÀO GOOGLE MEET NGAY</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-white/10 text-center space-y-2">
            <h2 className="text-xl font-bold text-white">Xin chào, {profile.full_name}! 👋</h2>
            <p className="text-xs text-slate-400">
              Hiện tại bạn chưa có lịch học nào sắp diễn ra. Hãy theo dõi thông báo từ thầy cô!
            </p>
          </div>
        )}

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/student/exams"
            className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/50 backdrop-blur-xl transition-all group flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                Làm Bài Kiểm Tra Trực Tuyến
              </h3>
              <p className="text-xs text-slate-400">
                Làm bài trắc nghiệm & tự luận Hoá học, xem kết quả và điểm số
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </Link>

          <Link
            href="/student/tuition"
            className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/50 backdrop-blur-xl transition-all group flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                Học Phí & Mã VietQR
              </h3>
              <p className="text-xs text-slate-400">
                Xem công nợ học phí hàng tháng và quét mã QR chuyển khoản
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </Link>
        </div>

        {/* Classes Enrolled */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Lớp Học Đang Tham Gia ({classes.length})
          </h3>

          {classes.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-slate-400 text-xs">
              Bạn chưa được thêm vào lớp học nào. Hãy báo giáo viên cấp mã lớp cho bạn nhé!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((cls: any) => (
                <div
                  key={cls.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Khối {cls.grade}
                      </span>
                      <h4 className="text-base font-bold text-white mt-1">{cls.name}</h4>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>

                  {cls.description && (
                    <p className="text-xs text-slate-400">{cls.description}</p>
                  )}

                  {cls.meet_link && (
                    <div className="pt-2 border-t border-white/5">
                      <a
                        href={cls.meet_link.startsWith("http") ? cls.meet_link : `https://${cls.meet_link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Google Meet Của Lớp</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Schedule List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Lịch Học Sắp Tới
          </h3>

          {upcomingSchedules.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-slate-400 text-xs">
              Chưa có lịch học nào sắp tới.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSchedules.map((sch: any) => {
                const meetUrl = sch.custom_meet_link || sch.classes?.meet_link;
                const start = new Date(sch.start_time);
                const end = new Date(sch.end_time);

                return (
                  <div
                    key={sch.id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {sch.classes?.name}
                        </span>
                        <h4 className="font-semibold text-white text-sm">{sch.title}</h4>
                      </div>
                      <p className="text-xs text-cyan-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {start.toLocaleDateString("vi-VN")} (
                          {start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })})
                        </span>
                      </p>
                    </div>

                    {meetUrl && (
                      <a
                        href={meetUrl.startsWith("http") ? meetUrl : `https://${meetUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Vào Phòng Học</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
