"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getStudentInvoices } from "@/app/actions/tuition";
import { generateVietQRUrl, getBankConfig } from "@/lib/vietqr";
import {
  CreditCard,
  ArrowLeft,
  QrCode,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Download,
  AlertCircle,
  Loader2,
  Sparkles,
  Building2,
  Calendar,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

export default function StudentTuitionPage() {
  const [data, setData] = useState<{ profile: any; invoices: any[] }>({ profile: null, invoices: [] });
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const bankConfig = getBankConfig();

  async function loadData() {
    setLoading(true);
    const res = await getStudentInvoices();
    setData(res);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm">Đang tải thông tin học phí...</p>
      </div>
    );
  }

  const { profile, invoices } = data;

  // Lấy hóa đơn chưa thanh toán gần nhất làm hóa đơn nổi bật
  const pendingInvoice = invoices.find((inv) => inv.status === "pending") || null;
  const latestPaidInvoice = invoices.find((inv) => inv.status === "paid") || null;

  const activeInvoice = pendingInvoice || latestPaidInvoice || null;

  const activeQrUrl = activeInvoice
    ? generateVietQRUrl({
        amount: Number(activeInvoice.amount) || 0,
        transferContent: activeInvoice.invoice_code,
      })
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 selection:bg-emerald-500 selection:text-white py-8 px-4 sm:px-6">
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
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Học Phí & Mã Thanh Toán VietQR
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quét mã QR tự động điền sẵn số tiền và cú pháp chuyển khoản chính xác 100%
          </p>
        </div>

        {/* Active Invoice VietQR Card */}
        {activeInvoice ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/70 border border-emerald-500/30 backdrop-blur-xl shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
              {/* Left: VietQR Image & Download */}
              <div className="flex flex-col items-center space-y-3 flex-shrink-0">
                <div className="bg-white p-3 rounded-2xl shadow-2xl border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeQrUrl}
                    alt="Mã VietQR Học Phí"
                    className="w-56 sm:w-64 h-auto rounded-lg mx-auto"
                  />
                </div>

                <a
                  href={activeQrUrl}
                  download={`VietQR_${activeInvoice.invoice_code}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải ảnh QR về máy</span>
                </a>
              </div>

              {/* Right: Payment Details */}
              <div className="flex-1 space-y-4 w-full text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    {activeInvoice.status === "paid" ? "✅ Hóa Đơn Đã Nộp" : "⏳ Hóa Đơn Cần Thanh Toán"}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-950/80 border border-white/10 text-xs font-mono font-bold text-cyan-300">
                    Tháng {activeInvoice.billing_month}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                      Number(activeInvoice.amount) || 0
                    )}
                  </h2>
                  <p className="text-xs text-indigo-300 font-semibold mt-0.5">
                    Lớp: {activeInvoice.classes?.name} (Khối {activeInvoice.classes?.grade})
                  </p>
                </div>

                {/* Transfer Info Details */}
                <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 space-y-2.5 text-xs">
                  {/* Ngân hàng */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Ngân hàng thụ hưởng:</span>
                    <span className="font-bold text-cyan-300">{bankConfig.bankId}</span>
                  </div>

                  {/* STK */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Số tài khoản:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                      <span>{bankConfig.accountNo}</span>
                      <button
                        onClick={() => copyToClipboard(bankConfig.accountNo, "acc")}
                        className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                        title="Sao chép STK"
                      >
                        {copiedField === "acc" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Chủ TK */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Chủ tài khoản:</span>
                    <span className="font-bold text-white uppercase">{bankConfig.accountName}</span>
                  </div>

                  {/* Cú pháp chuyển khoản */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-slate-400">Nội dung chuyển khoản:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400">
                      <span>{activeInvoice.invoice_code}</span>
                      <button
                        onClick={() => copyToClipboard(activeInvoice.invoice_code, "code")}
                        className="p-1 text-slate-400 hover:text-emerald-300 transition-colors"
                        title="Sao chép cú pháp"
                      >
                        {copiedField === "code" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Badge & Helper */}
                {activeInvoice.status === "paid" ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Thầy cô đã xác nhận thanh toán học phí tháng {activeInvoice.billing_month} vào ngày{" "}
                      {new Date(activeInvoice.paid_at).toLocaleDateString("vi-VN")}.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <Smartphone className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Mở app ngân hàng bất kỳ (Vietcombank, MBBank, Agribank...) $\rightarrow$ Quét mã QR trên để nộp học phí nhanh chóng!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 rounded-3xl bg-slate-900/60 border border-white/10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Chưa có thông báo học phí mới</h3>
            <p className="text-xs text-slate-400">
              Hiện tại bạn không có hóa đơn học phí nào cần thanh toán. Hãy theo dõi thông báo từ thầy cô!
            </p>
          </div>
        )}

        {/* Invoices History Table */}
        <div className="space-y-4 pt-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            Lịch Sử Học Phí Các Tháng ({invoices.length})
          </h3>

          {invoices.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-xs text-slate-400">
              Chưa có lịch sử học phí nào.
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 uppercase text-[11px] font-semibold text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3.5">Tháng</th>
                    <th className="px-4 py-3.5">Lớp Học</th>
                    <th className="px-4 py-3.5">Cú Pháp CK</th>
                    <th className="px-4 py-3.5">Số Tiền</th>
                    <th className="px-4 py-3.5 text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((inv) => {
                    const isPaid = inv.status === "paid";
                    return (
                      <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-white">
                          Tháng {inv.billing_month}
                        </td>
                        <td className="px-4 py-3.5 text-indigo-300 font-semibold">
                          {inv.classes?.name}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-cyan-300">
                          {inv.invoice_code}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-emerald-400">
                          {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                            Number(inv.amount) || 0
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              <Check className="w-3 h-3" />
                              <span>Đã hoàn thành</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                              <Clock className="w-3 h-3" />
                              <span>Chưa nộp</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
