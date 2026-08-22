"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  getTeacherTuitionData,
  generateMonthlyInvoices,
  createSingleInvoice,
  toggleInvoiceStatus,
  deleteInvoice,
} from "@/app/actions/tuition";
import { generateVietQRUrl, getBankConfig, generateTransferContent } from "@/lib/vietqr";
import {
  CreditCard,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  QrCode,
  Download,
  Trash2,
  Search,
  Filter,
  Users,
  Building2,
  X,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  DollarSign,
  TrendingUp,
} from "lucide-react";

export default function TuitionManagementPage() {
  const [data, setData] = useState<any>({
    stats: { totalExpected: 0, totalPaid: 0, totalPending: 0, paidCount: 0, pendingCount: 0 },
    invoices: [],
    classes: [],
    availableMonths: [],
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal: Tạo tự động theo tháng
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoMonth, setAutoMonth] = useState<string>("");
  const [autoClassId, setAutoClassId] = useState<string>("all");
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);

  // Modal: Xem VietQR
  const [viewingQRInvoice, setViewingQRInvoice] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  const bankConfig = getBankConfig();

  // Khởi tạo tháng mặc định (tháng hiện tại hoặc tháng 09/2026)
  useEffect(() => {
    const now = new Date();
    const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    setAutoMonth(currentMonthStr);
  }, []);

  async function loadData() {
    setLoading(true);
    const res = await getTeacherTuitionData(selectedMonth, selectedClass);
    setData(res);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedClass]);

  // Lọc danh sách theo trạng thái & từ khóa tìm kiếm
  const filteredInvoices = useMemo(() => {
    return (data.invoices || []).filter((inv: any) => {
      // Lọc trạng thái
      if (selectedStatus !== "all" && inv.status !== selectedStatus) {
        return false;
      }
      // Lọc từ khóa
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const studentName = inv.profiles?.full_name?.toLowerCase() || "";
        const studentCode = inv.profiles?.student_code?.toLowerCase() || "";
        const invCode = inv.invoice_code?.toLowerCase() || "";
        const className = inv.classes?.name?.toLowerCase() || "";

        return (
          studentName.includes(query) ||
          studentCode.includes(query) ||
          invCode.includes(query) ||
          className.includes(query)
        );
      }
      return true;
    });
  }, [data.invoices, selectedStatus, searchQuery]);

  // Xử lý tạo tự động theo tháng
  async function handleGenerateMonthly(e: React.FormEvent) {
    e.preventDefault();
    if (!autoMonth) return;

    setAutoSubmitting(true);
    setAutoError(null);

    const res = await generateMonthlyInvoices({
      classId: autoClassId,
      billingMonth: autoMonth,
    });

    setAutoSubmitting(false);

    if (res.error) {
      setAutoError(res.error);
    } else {
      setShowAutoModal(false);
      showToast(
        `Đã tạo thành công ${res.createdCount} hóa đơn học phí (bỏ qua ${res.skippedCount} hóa đơn đã có)!`
      );
      loadData();
    }
  }

  // Chuyển đổi trạng thái thanh toán
  async function handleToggleStatus(invoice: any) {
    const nextStatus = invoice.status === "paid" ? "pending" : "paid";
    const res = await toggleInvoiceStatus(invoice.id, nextStatus);

    if (res.error) {
      alert(res.error);
    } else {
      showToast(
        nextStatus === "paid"
          ? `Đã xác nhận thanh toán cho học sinh ${invoice.profiles?.full_name || ""}!`
          : `Đã chuyển hóa đơn về trạng thái Chờ thanh toán.`
      );
      loadData();
    }
  }

  // Xóa hóa đơn
  async function handleDeleteInvoice(id: string, code: string) {
    if (!confirm(`Bạn có chắc chắn muốn xóa hóa đơn "${code}"?`)) return;
    const res = await deleteInvoice(id);
    if (res.error) {
      alert(res.error);
    } else {
      showToast("Đã xóa hóa đơn.");
      loadData();
    }
  }

  // Sao chép nội dung
  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  // Xuất file Excel báo cáo
  function exportToExcel() {
    if (filteredInvoices.length === 0) {
      alert("Không có hóa đơn nào để xuất file!");
      return;
    }

    const rows = filteredInvoices.map((inv: any, idx: number) => ({
      STT: idx + 1,
      "Mã HĐ (Cú pháp CK)": inv.invoice_code,
      "Mã Học Sinh": inv.profiles?.student_code || "",
      "Họ và Tên": inv.profiles?.full_name || "",
      "Lớp Học": inv.classes?.name || "",
      "Khối": inv.classes?.grade || "",
      "Tháng Thu": inv.billing_month,
      "Số Tiền (VNĐ)": Number(inv.amount) || 0,
      "Trạng Thái": inv.status === "paid" ? "Đã thanh toán" : "Chờ thanh toán",
      "Ngày Nộp": inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("vi-VN") : "",
      "SĐT Phụ Huynh": inv.profiles?.phone || "",
      "Email Liên Hệ": inv.profiles?.contact_email || "",
      "Ghi Chú": inv.note || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoHocPhi");
    XLSX.writeFile(wb, `Bao_Cao_Hoc_Phi_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const completionRate =
    data.stats.totalExpected > 0
      ? Math.round((data.stats.totalPaid / data.stats.totalExpected) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-medium text-sm shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Quản Lý Học Phí & Mã VietQR Động
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tự động tính công nợ theo lớp THCS, sinh mã VietQR chuẩn ngân hàng và theo dõi thu chi
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={exportToExcel}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Xuất Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => setShowAutoModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tạo Hóa Đơn Tháng Tự Động</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dự thu */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tổng Tiền Dự Thu</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-white">
            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
              data.stats.totalExpected
            )}
          </p>
          <p className="text-[11px] text-slate-400">
            Tổng cộng: {data.invoices.length} hóa đơn
          </p>
        </div>

        {/* Đã thu */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-emerald-500/30 backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Đã Thu Thành Công</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-emerald-300">
            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
              data.stats.totalPaid
            )}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{data.stats.paidCount} học sinh đã đóng</span>
            <span className="font-bold text-emerald-400">{completionRate}%</span>
          </div>
        </div>

        {/* Còn nợ */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-amber-500/30 backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>Còn Nợ Chưa Thu</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-amber-300">
            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
              data.stats.totalPending
            )}
          </p>
          <p className="text-[11px] text-slate-400">
            {data.stats.pendingCount} học sinh chưa hoàn thành
          </p>
        </div>

        {/* Tài khoản nhận học phí VietQR */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold">
            <span>Tài Khoản VietQR</span>
            <QrCode className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-sm font-bold text-white font-mono">{bankConfig.accountNo}</p>
          <p className="text-[11px] text-slate-300 uppercase truncate">{bankConfig.accountName}</p>
          <p className="text-[10px] text-cyan-400 font-semibold">{bankConfig.bankId}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên HS, mã HS..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Lớp */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả các lớp</option>
            {data.classes.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} (Khối {c.grade})
              </option>
            ))}
          </select>

          {/* Tháng */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả các tháng</option>
            {data.availableMonths.map((m: string) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>

          {/* Trạng thái */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ thanh toán</option>
            <option value="paid">Đã thanh toán</option>
          </select>
        </div>
      </div>

      {/* Invoice Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-sm">Đang tải danh sách học phí...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-white/5 text-center space-y-3 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CreditCard className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">Chưa có hóa đơn học phí nào</h3>
          <p className="text-xs text-slate-400">
            Bấm <strong>"Tạo Hóa Đơn Tháng Tự Động"</strong> để hệ thống tự động sinh công nợ và mã VietQR cho toàn bộ học sinh trong lớp.
          </p>
          <button
            onClick={() => setShowAutoModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tạo hóa đơn ngay</span>
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase text-[11px] font-semibold text-slate-400 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3.5">Mã HĐ (Cú pháp CK)</th>
                  <th className="px-4 py-3.5">Học Sinh</th>
                  <th className="px-4 py-3.5">Lớp Học</th>
                  <th className="px-4 py-3.5">Tháng</th>
                  <th className="px-4 py-3.5">Số Tiền</th>
                  <th className="px-4 py-3.5">Trạng Thái</th>
                  <th className="px-4 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInvoices.map((inv: any) => {
                  const isPaid = inv.status === "paid";
                  const qrUrl = generateVietQRUrl({
                    amount: Number(inv.amount) || 0,
                    transferContent: inv.invoice_code,
                  });

                  return (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                      {/* Mã HĐ / Cú pháp CK */}
                      <td className="px-4 py-3.5 font-mono font-bold text-cyan-300">
                        {inv.invoice_code}
                      </td>

                      {/* Thông tin HS */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-white">{inv.profiles?.full_name || "---"}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {inv.profiles?.student_code} {inv.profiles?.phone && `• ${inv.profiles.phone}`}
                        </div>
                      </td>

                      {/* Lớp */}
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-indigo-300">{inv.classes?.name}</span>
                        <span className="block text-[10px] text-slate-500">Khối {inv.classes?.grade}</span>
                      </td>

                      {/* Tháng */}
                      <td className="px-4 py-3.5 font-semibold text-slate-300">
                        {inv.billing_month}
                      </td>

                      {/* Số tiền */}
                      <td className="px-4 py-3.5 font-bold text-emerald-400">
                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                          Number(inv.amount) || 0
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3.5">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            <Check className="w-3 h-3" />
                            <span>Đã thanh toán</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            <Clock className="w-3 h-3" />
                            <span>Chờ thanh toán</span>
                          </span>
                        )}
                        {inv.paid_at && (
                          <span className="block text-[9px] text-slate-500 mt-0.5">
                            {new Date(inv.paid_at).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        {/* Nút Xem VietQR */}
                        <button
                          onClick={() => setViewingQRInvoice({ ...inv, qrUrl })}
                          className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                          title="Xem mã VietQR"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">QR</span>
                        </button>

                        {/* Nút Đổi trạng thái thu tiền */}
                        <button
                          onClick={() => handleToggleStatus(inv)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1 ${
                            isPaid
                              ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                          }`}
                        >
                          {isPaid ? "Hủy thu" : "Đã thu tiền"}
                        </button>

                        {/* Nút Xóa */}
                        <button
                          onClick={() => handleDeleteInvoice(inv.id, inv.invoice_code)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Xóa hóa đơn"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: TỰ ĐỘNG TẠO HÓA ĐƠN THEO THÁNG */}
      {showAutoModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowAutoModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Tạo Hóa Đơn Học Phí Tự Động
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tự động tạo hóa đơn và sinh mã VietQR cho toàn bộ học sinh trong lớp
              </p>
            </div>

            {autoError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{autoError}</span>
              </div>
            )}

            <form onSubmit={handleGenerateMonthly} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Áp dụng cho Lớp học *
                </label>
                <select
                  value={autoClassId}
                  onChange={(e) => setAutoClassId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="all">Tất cả các lớp học của bạn</option>
                  {data.classes.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Khối {c.grade} • {new Intl.NumberFormat("vi-VN").format(c.monthly_fee || 0)}đ/tháng)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tháng tính học phí (MM/YYYY) *
                </label>
                <input
                  type="text"
                  required
                  value={autoMonth}
                  onChange={(e) => setAutoMonth(e.target.value)}
                  placeholder="Ví dụ: 09/2026 hoặc 10/2026"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Cú pháp chuyển khoản sẽ tự sinh dạng: <span className="font-mono text-cyan-300 font-bold">HP [MãHS] T{parseInt(autoMonth) || 9}</span>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAutoModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={autoSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {autoSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Tạo Hóa Đơn Ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XEM MÃ VIETQR ĐỘNG CỦA HỌC SINH */}
      {viewingQRInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-cyan-950/80 space-y-5 relative text-center">
            <button
              onClick={() => setViewingQRInvoice(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Mã VietQR Thanh Toán Học Phí
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                {viewingQRInvoice.profiles?.full_name} ({viewingQRInvoice.profiles?.student_code})
              </h3>
              <p className="text-xs text-slate-400">
                Lớp {viewingQRInvoice.classes?.name} • Tháng {viewingQRInvoice.billing_month}
              </p>
            </div>

            {/* QR Code Image */}
            <div className="bg-white p-3 rounded-2xl inline-block shadow-xl border border-slate-200 mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewingQRInvoice.qrUrl}
                alt="VietQR Học Phí"
                className="w-56 h-auto rounded-lg mx-auto"
              />
            </div>

            {/* Bank Details Table */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Ngân hàng:</span>
                <span className="font-bold text-cyan-300">{bankConfig.bankId}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Số tài khoản:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                  <span>{bankConfig.accountNo}</span>
                  <button
                    onClick={() => copyToClipboard(bankConfig.accountNo, "acc")}
                    className="p-1 text-slate-400 hover:text-cyan-300"
                    title="Sao chép STK"
                  >
                    {copiedField === "acc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Chủ tài khoản:</span>
                <span className="font-bold text-white uppercase">{bankConfig.accountName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Số tiền:</span>
                <span className="font-bold text-emerald-400">
                  {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                    Number(viewingQRInvoice.amount) || 0
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-slate-400">Cú pháp CK:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-300">
                  <span>{viewingQRInvoice.invoice_code}</span>
                  <button
                    onClick={() => copyToClipboard(viewingQRInvoice.invoice_code, "code")}
                    className="p-1 text-slate-400 hover:text-indigo-300"
                    title="Sao chép cú pháp"
                  >
                    {copiedField === "code" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={viewingQRInvoice.qrUrl}
                download={`VietQR_${viewingQRInvoice.invoice_code}.png`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-cyan-600/30"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Ảnh QR</span>
              </a>
              <button
                type="button"
                onClick={() => setViewingQRInvoice(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
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
