"use client";

import React, { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  getClassDetails,
  addStudentToClass,
  removeStudentFromClass,
  updateClass,
  deleteClass,
  resetStudentPassword,
  importStudentsFromExcel,
} from "@/app/actions/classes";
import { createSchedule, deleteSchedule } from "@/app/actions/schedules";
import {
  Users,
  Calendar,
  Video,
  UserPlus,
  Plus,
  Trash2,
  Edit,
  ArrowLeft,
  GraduationCap,
  Clock,
  Key,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  X,
  CreditCard,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const classId = resolvedParams.id;
  const router = useRouter();

  const [clsData, setClsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"students" | "schedules">("students");

  // State cho Modal Sửa lớp
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [updatingClass, setUpdatingClass] = useState(false);
  const [editClassError, setEditClassError] = useState<string | null>(null);

  // State cho Modal thêm học sinh đơn lẻ
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // State cho Modal Import Excel
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelStudents, setExcelStudents] = useState<any[]>([]);
  const [importingExcel, setImportingExcel] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State cho Modal thêm buổi học
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Toast / Thông báo tạm thời
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  }

  async function loadData() {
    setLoading(true);
    const data = await getClassDetails(classId);
    setClsData(data);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [classId]);

  async function handleUpdateClass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUpdatingClass(true);
    setEditClassError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("classId", classId);

    const res = await updateClass(formData);
    setUpdatingClass(false);

    if (res.error) {
      setEditClassError(res.error);
    } else {
      setShowEditClassModal(false);
      showToast("Cập nhật thông tin lớp học thành công!");
      loadData();
    }
  }

  async function handleDeleteClass() {
    if (!confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN lớp "${clsData?.name}"?\nToàn bộ học sinh và lịch học của lớp này sẽ bị xóa.`)) {
      return;
    }

    const res = await deleteClass(classId);
    if (res.error) {
      alert(res.error);
    } else {
      router.push("/dashboard/classes");
    }
  }

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
      showToast("Đã thêm học sinh và cấp tài khoản thành công!");
      loadData();
    }
  }

  async function handleResetPassword(studentId: string, studentName: string, studentCode: string) {
    if (!confirm(`Bạn có chắc muốn cấp lại mật khẩu mặc định (123456) cho học sinh ${studentName} (${studentCode})?\nMật khẩu cũ của học sinh sẽ bị vô hiệu hóa.`)) {
      return;
    }

    const res = await resetStudentPassword(studentId, classId, "123456");
    if (res.error) {
      alert(res.error);
    } else {
      showToast(`Đã reset mật khẩu của ${studentName} về "123456". Học sinh sẽ phải đổi mật khẩu khi đăng nhập!`);
      loadData();
    }
  }

  // Xử lý đọc file Excel tải lên
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelError(null);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rawData.length < 2) {
          setExcelError("File Excel không có dữ liệu học sinh!");
          return;
        }

        // Bỏ qua dòng tiêu đề đầu tiên, map các cột
        const parsed: any[] = [];
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;

          const studentCode = String(row[0] || "").trim();
          const fullName = String(row[1] || "").trim();
          const phone = String(row[2] || "").trim();
          const contactEmail = String(row[3] || "").trim();
          const password = String(row[4] || "123456").trim();

          if (studentCode && fullName) {
            parsed.push({
              studentCode,
              fullName,
              phone,
              contactEmail,
              password,
            });
          }
        }

        if (parsed.length === 0) {
          setExcelError("Không tìm thấy dòng học sinh hợp lệ (cần ít nhất Cột 1: Mã HS, Cột 2: Họ tên)!");
        } else {
          setExcelStudents(parsed);
        }
      } catch (err: any) {
        setExcelError(`Lỗi đọc file Excel: ${err.message}`);
      }
    };

    reader.readAsBinaryString(file);
  }

  // Tải file mẫu Excel
  function downloadTemplateExcel() {
    const templateData = [
      ["Mã Học Sinh (*)", "Họ và Tên (*)", "Số điện thoại / Zalo", "Email liên hệ (Tùy chọn)", "Mật khẩu ban đầu (Tùy chọn)"],
      ["HS01", "Nguyễn Văn An", "0912345678", "nguyenan@gmail.com", "123456"],
      ["HS02", "Trần Thị Bình", "0987654321", "binhtran@gmail.com", "123456"],
      ["HS03", "Lê Hoàng Cường", "0905123456", "", "123456"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachHocSinh");
    XLSX.writeFile(wb, `Mau_Danh_Sach_Hoc_Sinh_${clsData?.name || "Lop"}.xlsx`);
  }

  // Xác nhận nhập danh sách Excel
  async function handleConfirmImportExcel() {
    if (excelStudents.length === 0) return;
    setImportingExcel(true);
    setExcelError(null);

    const res = await importStudentsFromExcel(classId, excelStudents);
    setImportingExcel(false);

    if (res.error) {
      setExcelError(res.error);
    } else {
      setShowExcelModal(false);
      setExcelStudents([]);
      showToast(`Đã nhập thành công ${res.count} học sinh vào lớp!`);
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
      showToast("Lên lịch buổi học mới thành công!");
      loadData();
    }
  }

  async function handleRemoveStudent(membershipId: string, name: string) {
    if (!confirm(`Bạn có chắc chắn muốn xoá học sinh ${name} khỏi lớp này?`)) return;
    await removeStudentFromClass(membershipId, classId);
    showToast("Đã xóa học sinh khỏi lớp.");
    loadData();
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm("Bạn có chắc chắn muốn xoá buổi học này?")) return;
    await deleteSchedule(scheduleId, classId);
    showToast("Đã xóa buổi học.");
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

  const nextStudentCode = `HS${String(clsData.students.length + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-medium text-sm shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

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

        {/* Buttons: Sửa lớp, Xóa lớp, Link Meet */}
        <div className="flex items-center gap-2 flex-wrap">
          {clsData.meet_link && (
            <a
              href={clsData.meet_link.startsWith("http") ? clsData.meet_link : `https://${clsData.meet_link}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Video className="w-4 h-4" />
              <span>Google Meet</span>
            </a>
          )}

          <button
            onClick={() => setShowEditClassModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Edit className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sửa Lớp</span>
          </button>

          <button
            onClick={handleDeleteClass}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xoá Lớp</span>
          </button>
        </div>
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

      {/* TAB 1: Danh sách Học sinh */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              💡 Học sinh đăng nhập bằng <strong>Mã Học Sinh</strong> và sẽ <strong>bắt buộc đổi mật khẩu</strong> ở lần đầu.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowExcelModal(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Nhập hàng loạt từ Excel</span>
              </button>

              <button
                onClick={() => setShowAddStudentModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Thêm học sinh</span>
              </button>
            </div>
          </div>

          {clsData.students.length === 0 ? (
            <div className="p-10 rounded-2xl bg-slate-900/40 border border-white/5 text-center space-y-3">
              <p className="text-sm text-slate-400">Lớp chưa có học sinh nào.</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="text-xs text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm học sinh lẻ
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => setShowExcelModal(true)}
                  className="text-xs text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Nhập từ file Excel
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 uppercase text-[11px] font-semibold text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3.5">Mã HS</th>
                      <th className="px-4 py-3.5">Họ và Tên</th>
                      <th className="px-4 py-3.5">SĐT / Zalo</th>
                      <th className="px-4 py-3.5">Email Thông Báo</th>
                      <th className="px-4 py-3.5">Trạng thái MK</th>
                      <th className="px-4 py-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {clsData.students.map((st: any) => (
                      <tr key={st.membershipId} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-cyan-300">
                          {st.profile?.student_code || "---"}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-white">
                          {st.profile?.full_name || "Chưa cập nhật"}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">
                          {st.profile?.phone || "---"}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">
                          {st.profile?.contact_email ? (
                            <span className="text-indigo-300">{st.profile.contact_email}</span>
                          ) : (
                            <span className="text-slate-600 italic">Chưa có</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {st.profile?.must_change_password ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                              Chưa đổi MK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                              Đã đổi MK riêng
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1">
                          <button
                            onClick={() =>
                              handleResetPassword(
                                st.profile?.id,
                                st.profile?.full_name,
                                st.profile?.student_code
                              )
                            }
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all"
                            title="Cấp lại mật khẩu mặc định (123456)"
                          >
                            <Key className="w-4 h-4 inline" />
                          </button>

                          <button
                            onClick={() => handleRemoveStudent(st.membershipId, st.profile?.full_name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Xóa khỏi lớp"
                          >
                            <Trash2 className="w-4 h-4 inline" />
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

      {/* MODAL: Sửa thông tin Lớp học */}
      {showEditClassModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setShowEditClassModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-400" />
                Chỉnh Sửa Thông Tin Lớp
              </h3>
              <p className="text-xs text-slate-400 mt-1">Cập nhật tên, khối học, link Meet hoặc học phí</p>
            </div>

            {editClassError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {editClassError}
              </div>
            )}

            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tên Lớp Học *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={clsData.name}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Khối Lớp *
                  </label>
                  <select
                    name="grade"
                    required
                    defaultValue={clsData.grade}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                    <option value="Khác">Luyện thi ĐH / Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Học phí / Tháng (VNĐ)
                  </label>
                  <input
                    type="number"
                    name="monthlyFee"
                    defaultValue={clsData.monthly_fee || 500000}
                    step="10000"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Link Google Meet Cố Định
                </label>
                <input
                  type="text"
                  name="meetLink"
                  defaultValue={clsData.meet_link || ""}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Mô tả / Ghi chú
                </label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={clsData.description || ""}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEditClassModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updatingClass}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {updatingClass && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm học sinh lẻ */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                Thêm Học Sinh Mới
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

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email liên hệ / Phụ huynh (Tùy chọn)
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  placeholder="phuhuynh@gmail.com (không bắt buộc)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Dùng để gửi email nhắc lịch học & hóa đơn học phí tự động.
                </p>
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

      {/* MODAL: Nhập danh sách học sinh từ Excel */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowExcelModal(false);
                setExcelStudents([]);
              }}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Nhập Danh Sách Học Sinh Từ File Excel
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tự động tạo tài khoản hàng loạt cho tất cả học sinh trong file
              </p>
            </div>

            {/* Template Download Banner */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-emerald-300">Chưa có file mẫu chuẩn?</p>
                <p className="text-[11px] text-slate-300">
                  Tải file Excel mẫu có sẵn cột: Mã HS, Họ tên, SĐT, Email và Mật khẩu.
                </p>
              </div>
              <button
                onClick={downloadTemplateExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải File Mẫu (.xlsx)</span>
              </button>
            </div>

            {excelError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{excelError}</span>
              </div>
            )}

            {/* Upload Area */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 hover:border-emerald-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-950/40 space-y-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-white">
                  Bấm vào đây để chọn file Excel (.xlsx, .xls, .csv)
                </p>
                <p className="text-[11px] text-slate-500">
                  Hoặc kéo thả file Excel danh sách học sinh vào khung này
                </p>
              </div>
            </div>

            {/* Preview Table */}
            {excelStudents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    Xem trước ({excelStudents.length} học sinh sẵn sàng nhập)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Mật khẩu mặc định: <strong>123456</strong>
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto border border-white/10 rounded-xl bg-slate-950/80">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-900 sticky top-0 border-b border-white/10 text-slate-400 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Mã HS</th>
                        <th className="px-3 py-2">Họ và Tên</th>
                        <th className="px-3 py-2">SĐT</th>
                        <th className="px-3 py-2">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {excelStudents.map((st, i) => (
                        <tr key={i} className="hover:bg-white/5">
                          <td className="px-3 py-2 font-mono font-bold text-cyan-300">
                            {st.studentCode}
                          </td>
                          <td className="px-3 py-2 font-medium text-white">{st.fullName}</td>
                          <td className="px-3 py-2 text-slate-400">{st.phone || "---"}</td>
                          <td className="px-3 py-2 text-slate-400">{st.contactEmail || "---"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelStudents([]);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Đóng
              </button>

              <button
                type="button"
                disabled={excelStudents.length === 0 || importingExcel}
                onClick={handleConfirmImportExcel}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {importingExcel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Nhập {excelStudents.length} Học Sinh Vào Lớp</span>
              </button>
            </div>
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
