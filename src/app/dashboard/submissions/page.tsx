"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getTeacherSubmissionsData } from "@/app/actions/submissions";
import { resetStudentSubmission } from "@/app/actions/exams";
import {
  FileCheck,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Eye,
  Loader2,
  X,
  Filter,
  Layers,
  RotateCcw,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function SubmissionsDashboardPage() {
  const [data, setData] = useState<{ submissions: any[]; exams: any[]; stats: any }>({
    submissions: [],
    exams: [],
    stats: { totalSubmissions: 0, avgScore: 0, flaggedCount: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal xem chi tiết log rời tab
  const [viewingLogSub, setViewingLogSub] = useState<any | null>(null);

  async function loadData() {
    setLoading(true);
    const res = await getTeacherSubmissionsData(selectedExamId === "all" ? undefined : selectedExamId);
    setData(res);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [selectedExamId]);

  // Lọc theo từ khóa tìm kiếm học sinh
  const filteredSubmissions = useMemo(() => {
    return data.submissions.filter((s) => {
      const nameMatch = s.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const codeMatch = s.profiles?.student_code?.toLowerCase().includes(searchQuery.toLowerCase());
      return nameMatch || codeMatch;
    });
  }, [data.submissions, searchQuery]);

  // Xuất file Excel bảng điểm
  function exportToExcel() {
    if (filteredSubmissions.length === 0) {
      alert("Không có dữ liệu bài nộp để xuất Excel!");
      return;
    }

    const rows = filteredSubmissions.map((s, idx) => ({
      STT: idx + 1,
      "Mã Học Sinh": s.profiles?.student_code || "---",
      "Họ và Tên": s.profiles?.full_name || "---",
      "Số Điện Thoại": s.profiles?.phone || "---",
      "Đề Thi": s.exams?.title || "---",
      "Lớp": s.exams?.classes?.name || "---",
      "Khối": s.exams?.classes?.grade || "---",
      "Điểm Số": s.score,
      "Thang Điểm": s.exams?.total_points || 10,
      "Số Lần Rời Tab": s.tab_switch_count || 0,
      "Đánh Giá": (s.tab_switch_count || 0) > 0 ? "Cảnh báo gian lận" : "Nghiêm túc",
      "Thời Gian Nộp": s.submitted_at
        ? new Date(s.submitted_at).toLocaleString("vi-VN")
        : "---",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bang_Diem");
    XLSX.writeFile(workbook, `Bang_Diem_Kiem_Tra_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // Giáo viên đặt lại bài thi cho 1 học sinh cụ thể
  async function handleResetSingleSubmission(examId: string, studentId: string, studentName: string) {
    if (!confirm(`Bạn có chắc chắn muốn đặt lại (xóa bài nộp) để cho phép học sinh "${studentName}" làm lại bài thi này?`)) {
      return;
    }

    const res = await resetStudentSubmission(examId, studentId);
    if (res.error) {
      alert(res.error);
    } else {
      alert(`Đã đặt lại bài thi thành công. Học sinh ${studentName} có thể vào làm lại bài ngay bây giờ!`);
      loadData();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-emerald-400" />
            Kết Quả Bài Làm & Giám Sát Gian Lận (Proctoring)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi bảng điểm, xem chi tiết số lần rời tab và cho phép học sinh làm lại bài thi
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
                  <th className="px-4 py-3.5 text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredSubmissions.map((sub) => {
                  const hasTabSwitch = (sub.tab_switch_count || 0) > 0;

                  return (
                    <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white">{sub.profiles?.full_name || "---"}</div>
                        <div className="text-[11px] text-cyan-400 font-mono">
                          {sub.profiles?.student_code || "---"}
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
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold transition-all animate-pulse"
                            title="Bấm để xem log chi tiết"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{sub.tab_switch_count} lần rời tab!</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
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
                        <div className="flex items-center justify-end gap-1.5">
                          {hasTabSwitch && (
                            <button
                              onClick={() => setViewingLogSub(sub)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all text-xs flex items-center gap-1"
                              title="Xem chi tiết log"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Log</span>
                            </button>
                          )}

                          {/* NÚT ĐẶT LẠI BÀI THI CHO HỌC SINH NÀY (CHO PHÉP THI LẠI) */}
                          <button
                            onClick={() =>
                              handleResetSingleSubmission(
                                sub.exam_id,
                                sub.student_id,
                                sub.profiles?.full_name || "học sinh"
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all text-xs flex items-center gap-1 font-semibold"
                            title="Xóa bài nộp để cho phép học sinh này làm lại"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Cho thi lại</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: XEM CHI TIẾT LOG SỰ KIỆN RỜI TAB */}
      {viewingLogSub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setViewingLogSub(null)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Nhật Ký Giám Sát: {viewingLogSub.profiles?.full_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Đề: {viewingLogSub.exams?.title} • Phát hiện {viewingLogSub.tab_switch_count} lần vi phạm
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
              {(viewingLogSub.blur_events_log || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Không có bản ghi chi tiết nào.
                </p>
              ) : (
                viewingLogSub.blur_events_log.map((log: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-slate-300 font-medium">{log.event || "Rời khỏi tab thi"}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {log.time ? new Date(log.time).toLocaleTimeString("vi-VN") : "---"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const sub = viewingLogSub;
                  setViewingLogSub(null);
                  handleResetSingleSubmission(
                    sub.exam_id,
                    sub.student_id,
                    sub.profiles?.full_name || "học sinh"
                  );
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cho Học Sinh Này Thi Lại</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingLogSub(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
