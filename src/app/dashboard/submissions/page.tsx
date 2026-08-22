"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { getTeacherSubmissionsData } from "@/app/actions/submissions";
import {
  FileCheck,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Award,
  Users,
  Eye,
  X,
  Loader2,
  ShieldAlert,
  GraduationCap,
} from "lucide-react";

export default function SubmissionsDashboardPage() {
  const [data, setData] = useState<any>({
    submissions: [],
    exams: [],
    stats: { totalSubmissions: 0, avgScore: 0, flaggedCount: 0 },
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedExamId, setSelectedExamId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal Log Rời Tab
  const [viewingLogSub, setViewingLogSub] = useState<any | null>(null);

  async function loadData() {
    setLoading(true);
    const res = await getTeacherSubmissionsData(selectedExamId);
    setData(res);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [selectedExamId]);

  const filteredSubmissions = useMemo(() => {
    return (data.submissions || []).filter((sub: any) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const studentName = sub.profiles?.full_name?.toLowerCase() || "";
        const studentCode = sub.profiles?.student_code?.toLowerCase() || "";
        const examTitle = sub.exams?.title?.toLowerCase() || "";
        return studentName.includes(q) || studentCode.includes(q) || examTitle.includes(q);
      }
      return true;
    });
  }, [data.submissions, searchQuery]);

  // Xuất file Excel bảng điểm
  function exportToExcel() {
    if (filteredSubmissions.length === 0) {
      alert("Không có bài làm nào để xuất file!");
      return;
    }

    const rows = filteredSubmissions.map((s: any, idx: number) => ({
      STT: idx + 1,
      "Mã Học Sinh": s.profiles?.student_code || "",
      "Họ và Tên": s.profiles?.full_name || "",
      "Đề Kiểm Tra": s.exams?.title || "",
      "Lớp Học": s.exams?.classes?.name || "",
      "Khối": s.exams?.classes?.grade || "",
      "Điểm Số": Number(s.score) || 0,
      "Thang Điểm": Number(s.exams?.total_points) || 10,
      "Số Lần Rời Tab": Number(s.tab_switch_count) || 0,
      "Thời Gian Nộp": s.submitted_at ? new Date(s.submitted_at).toLocaleString("vi-VN") : "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BangDiemKiemTra");
    XLSX.writeFile(wb, `Bang_Diem_Kiem_Tra_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-indigo-400" />
            Kết Quả Bài Thi & Giám Sát Gian Lận
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi bảng điểm, phân tích kết quả bài làm và phát hiện hành vi rời tab của học sinh
          </p>
        </div>

        <button
          onClick={exportToExcel}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Xuất Bảng Điểm (.xlsx)</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-xl space-y-1">
          <span className="text-xs text-slate-400 font-semibold">Tổng Số Bài Nộp</span>
          <p className="text-2xl font-black text-white">{data.stats.totalSubmissions}</p>
          <p className="text-[11px] text-slate-500">Lượt làm bài đã hoàn thành</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-emerald-500/30 backdrop-blur-xl space-y-1">
          <span className="text-xs text-emerald-400 font-semibold">Điểm Số Trung Bình</span>
          <p className="text-2xl font-black text-emerald-300">{data.stats.avgScore} / 10 đ</p>
          <p className="text-[11px] text-slate-500">Toàn bộ các đề kiểm tra</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-amber-500/30 backdrop-blur-xl space-y-1">
          <span className="text-xs text-amber-400 font-semibold">Cảnh Báo Rời Tab Thi</span>
          <p className="text-2xl font-black text-amber-300">{data.stats.flaggedCount} bài</p>
          <p className="text-[11px] text-slate-500">Phát hiện học sinh chuyển cửa sổ</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên học sinh, mã HS..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="w-full md:w-auto px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
        >
          <option value="all">Tất cả đề kiểm tra</option>
          {data.exams.map((ex: any) => (
            <option key={ex.id} value={ex.id}>
              {ex.title} ({ex.classes?.name})
            </option>
          ))}
        </select>
      </div>

      {/* Submissions Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-sm">Đang tải bảng điểm...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-white/5 text-center space-y-3 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <FileCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">Chưa có bài nộp nào</h3>
          <p className="text-xs text-slate-400">
            Khi học sinh hoàn thành bài kiểm tra, điểm số và log giám sát gian lận sẽ hiển thị tự động tại đây.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase text-[11px] font-semibold text-slate-400 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3.5">Học Sinh</th>
                  <th className="px-4 py-3.5">Đề Kiểm Tra</th>
                  <th className="px-4 py-3.5">Điểm Số</th>
                  <th className="px-4 py-3.5">Giám Sát Rời Tab</th>
                  <th className="px-4 py-3.5">Thời Gian Nộp</th>
                  <th className="px-4 py-3.5 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSubmissions.map((sub: any) => {
                  const hasTabSwitch = (sub.tab_switch_count || 0) > 0;

                  return (
                    <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white">{sub.profiles?.full_name || "---"}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {sub.profiles?.student_code}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-indigo-300">{sub.exams?.title}</span>
                        <span className="block text-[10px] text-slate-500">
                          {sub.exams?.classes?.name} (Khối {sub.exams?.classes?.grade})
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono font-black text-sm border border-emerald-500/30">
                          {sub.score} / {sub.exams?.total_points || 10} đ
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {hasTabSwitch ? (
                          <button
                            onClick={() => setViewingLogSub(sub)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all"
                            title="Bấm để xem log chi tiết"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{sub.tab_switch_count} lần rời tab</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Nghiêm túc (0 lần)</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-slate-400">
                        {sub.submitted_at
                          ? new Date(sub.submitted_at).toLocaleString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })
                          : "---"}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {hasTabSwitch && (
                          <button
                            onClick={() => setViewingLogSub(sub)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs"
                            title="Xem chi tiết log"
                          >
                            <Eye className="w-3.5 h-3.5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CHI TIẾT LOG GIÁM SÁT RỜI TAB */}
      {viewingLogSub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setViewingLogSub(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Log Giám Sát Rời Tab</h3>
                <p className="text-xs text-slate-400">
                  {viewingLogSub.profiles?.full_name} ({viewingLogSub.profiles?.student_code})
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Đề kiểm tra:</span>
                <span className="font-semibold text-white truncate max-w-[200px]">{viewingLogSub.exams?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tổng số lần phát hiện:</span>
                <span className="font-bold text-amber-400">{viewingLogSub.tab_switch_count} lần</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">Chi tiết các mốc thời gian:</span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {(viewingLogSub.blur_events_log || []).map((ev: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-950/60 border border-white/5 text-[11px] flex items-center justify-between text-slate-400 font-mono"
                  >
                    <span>Lần #{idx + 1}: {ev.event === "document_hidden" ? "Rời khỏi tab thi" : "Chuyển cửa sổ khác"}</span>
                    <span className="text-amber-400">{new Date(ev.time).toLocaleTimeString("vi-VN")}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setViewingLogSub(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
