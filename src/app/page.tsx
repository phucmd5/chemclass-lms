import Link from "next/link";
import { 
  GraduationCap, 
  FlaskConical, 
  Sparkles, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  Video, 
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { MathText } from "@/components/KatexFormula";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white selection:bg-indigo-500 selection:text-white">
      {/* Header / Nav */}
      <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                ChemClass LMS
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Serverless v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-1.5"
            >
              Vào hệ thống
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Nền tảng Quản lý Dạy học & Sinh đề Hoá học Thông minh</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Giảng dạy Hoá học hiện đại với{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
              Trợ lý AI & Serverless
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed">
            Hệ thống quản lý lớp học trọn gói: Tự động hoá thời khoá biểu, nhắc học phí qua mã VietQR, 
            sinh đề thi công thức Hoá học bằng AI, và tổ chức thi trực tuyến có giám sát.
          </p>

          {/* Quick CTA Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all group"
            >
              <GraduationCap className="w-5 h-5" />
              <span>Giao diện Giáo viên</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/student"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>Giao diện Học sinh</span>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-20">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm hover:border-indigo-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Sinh đề thi Hoá học bằng AI</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              <MathText text="Tạo câu hỏi trắc nghiệm và tự luận có công thức LaTeX hóa học chuẩn xác ($\text{BaSO}_4\downarrow$, $\text{H}_2\text{SO}_4$) chỉ trong vài giây." />
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm hover:border-cyan-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Thi Online & Giám sát Chuyển Tab</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tự động đếm và ghi lại các lần học sinh rời màn hình hoặc đổi ứng dụng khi làm bài thi, cảnh báo nhẹ nhàng và chấm trắc nghiệm tức thì.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm hover:border-emerald-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Học phí & Mã VietQR Động</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tạo mã QR kèm sẵn số tiền và cú pháp chuyển khoản cho từng học sinh. Quản lý công nợ và trạng thái đóng phí minh bạch.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm hover:border-purple-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Thời khóa biểu & Lớp học</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Lịch dạy trực quan theo tuần/tháng, quản lý thông tin từng học sinh, danh sách điểm danh và ghi chú bài học.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm hover:border-amber-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Google Meet 1 Chạm</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tích hợp link Google Meet cố định cho từng lớp. Học sinh mở web là có thể bấm vào phòng học ngay lập tức.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm hover:border-rose-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Kiến trúc Serverless 100%</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Chạy trên Vercel + Supabase PostgreSQL. Chi phí 0 VNĐ/tháng ở giai đoạn khởi đầu, tự động mở rộng khi tăng số lượng học sinh.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
