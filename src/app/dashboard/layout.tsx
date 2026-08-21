export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentProfile, logoutUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import {
  FlaskConical,
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  Sparkles,
  FileCheck,
  LogOut,
  GraduationCap,
} from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // Nếu chưa đăng nhập hoặc là học sinh thì điều hướng đúng trang
  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "student") {
    redirect("/student");
  }

  const navItems = [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/dashboard/classes", label: "Lớp học & Học sinh", icon: Users },
    { href: "/dashboard/schedules", label: "Thời khóa biểu", icon: Calendar },
    { href: "/dashboard/tuition", label: "Quản lý Học phí", icon: CreditCard },
    { href: "/dashboard/exams", label: "Soạn đề AI (Hoá học)", icon: Sparkles },
    { href: "/dashboard/submissions", label: "Bài thi & Giám sát", icon: FileCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900/70 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between p-4 sm:p-6 backdrop-blur-xl">
        <div className="space-y-6">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base text-white">ChemClass</span>
              <span className="block text-xs text-indigo-400 font-medium">Giáo Viên Portal</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all group"
                >
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="pt-6 border-t border-white/10 mt-6 md:mt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs flex-shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{profile.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{profile.email}</p>
              </div>
            </div>

            <form action={logoutUser}>
              <button
                type="submit"
                title="Đăng xuất"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
