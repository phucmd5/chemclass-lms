"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getStudentExams } from "@/app/actions/exams";
import {
  Sparkles,
  ArrowLeft,
  Clock,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Eye,
  Award,
  Loader2,
  Calendar,
} from "lucide-react";

export default function StudentExamsPage() {
  const [data, setData] = useState<{ profile: any; exams: any[] }>({ profile: null, exams: [] });
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const res = await getStudentExams();
    setData(res);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm">Đang tải danh sách bài kiểm tra...</p>
      </div>
    );
  }

  const { profile, exams } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/student"
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-all text-xs font-semibold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Cổng Học Sinh</span>
          </Link>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Học sinh:</span>
            <span className="font-bold text-white">{profile?.full_name}</span>
            <span className="font-mono font-bold text-cyan-300">({profile?.student_code})</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            Bài Kiểm Tra Trực Tuyến
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Làm bài trắc nghiệm Hóa học & KHTN trực tiếp trên hệ thống, chấm điểm tự động tức thì
          </p>
        </div>

        {/* Exams List */}
        {exams.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-900/60 border border-white/10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Chưa có bài kiểm tra nào</h3>
            <p className="text-xs text-slate-400">
              Hiện tại các lớp bạn tham gia chưa có đề kiểm tra nào được mở. Hãy theo dõi thông báo từ giáo viên!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {exams.map((ex) => {
              const hasSubmitted = !!ex.mySubmission;

              return (
                <div
                  key={ex.id}
                  className={`p-6 rounded-3xl border backdrop-blur-xl transition-all flex flex-col justify-between space-y-4 ${
                    hasSubmitted
                      ? "bg-slate-900/70 border-emerald-500/30"
                      : "bg-slate-900/90 border-cyan-500/40 shadow-xl shadow-cyan-950/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {ex.classes?.name} (Khối {ex.classes?.grade})
                      </span>

                      {hasSubmitted ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Đã nộp bài</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Chưa làm bài</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white line-clamp-2">{ex.title}</h3>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{ex.duration_minutes} phút</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{ex.questionCount} câu hỏi</span>
                      </div>
                    </div>

                    {/* Result details if submitted */}
                    {hasSubmitted && (
                      <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="text-slate-400">Điểm số đạt được:</span>
                          <div className="text-lg font-black text-emerald-400">
                            {ex.mySubmission.score} / {ex.total_points} đ
                          </div>
                        </div>

                        {ex.mySubmission.tab_switch_count > 0 && (
                          <div className="text-right text-[11px] text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{ex.mySubmission.tab_switch_count} lần rời tab</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/5">
                    <Link
                      href={`/student/exams/${ex.id}`}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        hasSubmitted
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                          : "bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/25"
                      }`}
                    >
                      {hasSubmitted ? (
                        <>
                          <Eye className="w-4 h-4" />
                          <span>Xem lại bài làm & Đáp án</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4" />
                          <span>Bắt Đầu Làm Bài Ngay</span>
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
