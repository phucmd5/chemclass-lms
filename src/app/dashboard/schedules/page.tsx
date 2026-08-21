"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getTeacherSchedules, bookMultipleTimeSlots, deleteSchedule } from "@/app/actions/schedules";
import { TIME_SLOT_DEFS } from "@/lib/constants";
import { getTeacherClasses } from "@/app/actions/classes";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  Sparkles,
  BookOpen,
  CalendarDays,
  X,
  Layers,
  Repeat,
} from "lucide-react";

// Tạo danh sách 18 tuần học bắt đầu từ tuần khai giảng 05/09/2026
function generateSemesterWeeks() {
  const weeks = [];
  // Thứ 2 đầu tiên của học kỳ (31/08/2026 - Tuần có lễ khai giảng 05/09)
  const semesterStartMonday = new Date(2026, 7, 31); // Tháng 8 là index 7

  for (let i = 0; i < 18; i++) {
    const monday = new Date(semesterStartMonday);
    monday.setDate(monday.getDate() + i * 7);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const formatDayMonth = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

    weeks.push({
      weekNumber: i + 1,
      label: `Tuần ${i + 1} (${formatDayMonth(monday)} - ${formatDayMonth(sunday)}/${sunday.getFullYear()})`,
      startDate: monday,
      endDate: sunday,
    });
  }

  return weeks;
}

const SEMESTER_WEEKS = generateSemesterWeeks();

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tuần đang chọn (mặc định Tuần 1 hoặc tuần theo ngày hiện tại)
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  // State chọn tiết trên bảng: { dayDate: "YYYY-MM-DD", dayName: "Thứ 2", periods: [1, 2] }
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);

  // State Modal đặt lịch
  const [bookingClassId, setBookingClassId] = useState<string>("");
  const [bookingRepeatWeeks, setBookingRepeatWeeks] = useState<number>(1);
  const [customMeetLink, setCustomMeetLink] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  // Tải dữ liệu
  async function loadData() {
    setLoading(true);
    const [schList, clsList] = await Promise.all([getTeacherSchedules(), getTeacherClasses()]);
    setSchedules(schList);
    setClasses(clsList);
    if (clsList.length > 0 && !bookingClassId) {
      setBookingClassId(clsList[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();

    // Tự động tìm tuần gần nhất với ngày hôm nay
    const now = new Date();
    const foundIndex = SEMESTER_WEEKS.findIndex(
      (w) => now >= w.startDate && now <= new Date(w.endDate.getTime() + 24 * 60 * 60 * 1000)
    );
    if (foundIndex !== -1) {
      setCurrentWeekIndex(foundIndex);
    }
  }, []);

  const activeWeek = SEMESTER_WEEKS[currentWeekIndex] || SEMESTER_WEEKS[0];

  // Tính 7 ngày trong tuần được chọn (Thứ 2 -> Chủ nhật)
  const weekDays = useMemo(() => {
    const days = [];
    const dayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(activeWeek.startDate);
      d.setDate(d.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const isToday =
        new Date().toDateString() === d.toDateString();

      days.push({
        dayName: dayNames[i],
        dateStr,
        dateObj: d,
        formatted: `${day}/${month}`,
        isToday,
      });
    }
    return days;
  }, [activeWeek]);

  // Map lịch dạy theo ngày và tiết
  // slotMap[dateStr][period]: Schedule item
  const scheduleGrid = useMemo(() => {
    const map: Record<string, Record<number, any>> = {};

    for (const sch of schedules) {
      const startDate = new Date(sch.start_time);
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, "0");
      const day = String(startDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const startHours = startDate.getHours();
      const startMinutes = startDate.getMinutes();
      const startTimeDecimal = startHours + startMinutes / 60;

      // Xác định tiết học tương ứng
      let period = 1;
      if (startTimeDecimal >= 13) {
        period = 6; // Chiều
      } else if (startTimeDecimal >= 10.2) {
        period = 5;
      } else if (startTimeDecimal >= 9.5) {
        period = 4;
      } else if (startTimeDecimal >= 8.7) {
        period = 3;
      } else if (startTimeDecimal >= 7.7) {
        period = 2;
      } else {
        period = 1;
      }

      if (!map[dateStr]) map[dateStr] = {};
      map[dateStr][period] = sch;
    }

    return map;
  }, [schedules]);

  // Xử lý bấm vào một ô tiết học
  function handleCellClick(dateStr: string, period: number, existingSchedule: any) {
    if (existingSchedule) return; // Đã có lịch thì không chọn thêm

    if (selectedDay !== dateStr) {
      // Chọn ngày mới -> bắt đầu vùng chọn mới
      setSelectedDay(dateStr);
      setSelectedPeriods([period]);
    } else {
      // Cùng ngày: toggle hoặc mở rộng vùng chọn liên tục
      if (selectedPeriods.includes(period)) {
        const next = selectedPeriods.filter((p) => p !== period);
        if (next.length === 0) {
          setSelectedDay(null);
          setSelectedPeriods([]);
        } else {
          setSelectedPeriods(next);
        }
      } else {
        const minP = Math.min(...selectedPeriods, period);
        const maxP = Math.max(...selectedPeriods, period);
        // Tự động nối các tiết liên tục từ minP đến maxP
        const range: number[] = [];
        for (let p = minP; p <= maxP; p++) {
          range.push(p);
        }
        setSelectedPeriods(range);
      }
    }
  }

  // Xử lý xác nhận đặt lịch
  async function handleBookSlots(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDay || selectedPeriods.length === 0 || !bookingClassId) {
      setErrorMsg("Vui lòng chọn lớp học!");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const startPeriod = Math.min(...selectedPeriods);
    const endPeriod = Math.max(...selectedPeriods);

    const res = await bookMultipleTimeSlots({
      classId: bookingClassId,
      dateStr: selectedDay,
      startPeriod,
      endPeriod,
      customMeetLink: customMeetLink.trim() || undefined,
      note: note.trim() || undefined,
      repeatWeeksCount: bookingRepeatWeeks,
    });

    setSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSelectedDay(null);
      setSelectedPeriods([]);
      setCustomMeetLink("");
      setNote("");
      showToast(`Đã lên lịch thành công cho ${res.count} buổi học!`);
      loadData();
    }
  }

  async function handleDelete(scheduleId: string, title: string) {
    if (!confirm(`Bạn có chắc chắn muốn hủy lịch "${title}"?`)) return;
    const res = await deleteSchedule(scheduleId);
    if (res.error) {
      alert(res.error);
    } else {
      showToast("Đã xóa buổi học.");
      loadData();
    }
  }

  const selectedDayInfo = weekDays.find((d) => d.dateStr === selectedDay);
  const selectedPeriodRangeText = useMemo(() => {
    if (selectedPeriods.length === 0) return "";
    const minP = Math.min(...selectedPeriods);
    const maxP = Math.max(...selectedPeriods);
    const first = TIME_SLOT_DEFS.find((s) => s.period === minP);
    const last = TIME_SLOT_DEFS.find((s) => s.period === maxP);
    if (!first || !last) return "";
    if (minP === 6 && maxP === 6) return "Buổi Chiều (13:30 - 16:30)";
    if (minP === maxP) return `${first.name} (${first.startTime} - ${first.endTime})`;
    return `${first.name} đến ${last.name} (${first.startTime} - ${last.endTime})`;
  }, [selectedPeriods]);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-medium text-sm shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Week Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-cyan-400" />
            Thời Khóa Biểu & Lịch Dạy Học Kỳ
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Bấm chọn một hoặc nhiều tiết liên tục trên bảng để đăng ký lớp học (18 tuần học)
          </p>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center gap-2 self-start lg:self-auto bg-slate-900/90 border border-white/10 p-1.5 rounded-2xl backdrop-blur-xl">
          <button
            onClick={() => setCurrentWeekIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentWeekIndex === 0}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Tuần trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={currentWeekIndex}
            onChange={(e) => setCurrentWeekIndex(Number(e.target.value))}
            className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer px-2 py-1"
          >
            {SEMESTER_WEEKS.map((w, idx) => (
              <option key={w.weekNumber} value={idx} className="bg-slate-900 text-white">
                {w.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setCurrentWeekIndex((prev) => Math.min(SEMESTER_WEEKS.length - 1, prev + 1))}
            disabled={currentWeekIndex === SEMESTER_WEEKS.length - 1}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Tuần sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Timetable Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
          <p className="text-sm">Đang tải thời khóa biểu...</p>
        </div>
      ) : (
        <div className="bg-slate-900/70 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[950px]">
              {/* Table Header: 7 Days */}
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/80">
                  <th className="p-3.5 text-left text-xs font-bold text-slate-400 w-36 uppercase tracking-wider border-r border-white/10">
                    Khung Giờ
                  </th>
                  {weekDays.map((d) => (
                    <th
                      key={d.dateStr}
                      className={`p-3 text-center border-r border-white/10 last:border-r-0 ${
                        d.isToday ? "bg-cyan-500/10 text-cyan-300" : "text-slate-300"
                      }`}
                    >
                      <div className="font-bold text-xs">{d.dayName}</div>
                      <div
                        className={`text-[11px] font-mono mt-0.5 ${
                          d.isToday ? "text-cyan-400 font-bold" : "text-slate-500"
                        }`}
                      >
                        {d.formatted} {d.isToday && <span className="inline-block ml-1 px-1.5 py-0.2 rounded bg-cyan-400 text-slate-950 text-[9px] font-bold">Hôm nay</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body: 6 Time Slots */}
              <tbody className="divide-y divide-white/5">
                {/* Header Buổi sáng */}
                <tr className="bg-indigo-500/5">
                  <td
                    colSpan={8}
                    className="px-4 py-1.5 text-[11px] font-bold text-indigo-300 tracking-wider uppercase bg-slate-950/50"
                  >
                    ☀️ Buổi Sáng (Tiết 1 đến Tiết 5)
                  </td>
                </tr>

                {/* Tiết 1 -> 5 */}
                {TIME_SLOT_DEFS.filter((s) => s.session === "morning").map((slot) => (
                  <tr key={slot.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Time Slot Column */}
                    <td className="p-3 border-r border-white/10 bg-slate-950/30">
                      <div className="font-bold text-xs text-white">{slot.name}</div>
                      <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{slot.startTime} - {slot.endTime}</span>
                      </div>
                    </td>

                    {/* 7 Days Columns */}
                    {weekDays.map((d) => {
                      const item = scheduleGrid[d.dateStr]?.[slot.period];
                      const isSelected = selectedDay === d.dateStr && selectedPeriods.includes(slot.period);

                      return (
                        <td
                          key={d.dateStr}
                          onClick={() => handleCellClick(d.dateStr, slot.period, item)}
                          className={`p-2 border-r border-white/10 last:border-r-0 align-top transition-all cursor-pointer relative min-h-[70px] ${
                            isSelected
                              ? "bg-indigo-600/30 ring-2 ring-indigo-400/80 z-10"
                              : item
                              ? "bg-slate-950/40 hover:bg-slate-950/60"
                              : "hover:bg-cyan-500/5"
                          }`}
                        >
                          {item ? (
                            <div className="p-2.5 rounded-xl bg-indigo-950/70 border border-indigo-500/30 space-y-1 group relative">
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-xs text-indigo-200 line-clamp-1">
                                  {item.classes?.name || item.title}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(item.id, item.classes?.name || item.title);
                                  }}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Xóa buổi học này"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold text-[9px]">
                                  Khối {item.classes?.grade || "12"}
                                </span>
                              </div>

                              {(item.custom_meet_link || item.classes?.meet_link) && (
                                <a
                                  href={
                                    (item.custom_meet_link || item.classes?.meet_link).startsWith("http")
                                      ? item.custom_meet_link || item.classes?.meet_link
                                      : `https://${item.custom_meet_link || item.classes?.meet_link}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-semibold transition-all"
                                >
                                  <Video className="w-3 h-3" />
                                  <span>Meet</span>
                                </a>
                              )}
                            </div>
                          ) : isSelected ? (
                            <div className="h-full min-h-[50px] flex items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 font-bold text-xs animate-pulse">
                              Đã chọn
                            </div>
                          ) : (
                            <div className="h-full min-h-[50px] flex items-center justify-center rounded-xl border border-dashed border-white/5 opacity-0 hover:opacity-100 text-[10px] text-slate-500 font-medium">
                              + Đặt lịch
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Header Buổi chiều */}
                <tr className="bg-cyan-500/5">
                  <td
                    colSpan={8}
                    className="px-4 py-1.5 text-[11px] font-bold text-cyan-300 tracking-wider uppercase bg-slate-950/50"
                  >
                    ⛅ Buổi Chiều (13:30 - 16:30)
                  </td>
                </tr>

                {/* Khung giờ Chiều */}
                {TIME_SLOT_DEFS.filter((s) => s.session === "afternoon").map((slot) => (
                  <tr key={slot.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 border-r border-white/10 bg-slate-950/30">
                      <div className="font-bold text-xs text-white">{slot.name}</div>
                      <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{slot.startTime} - {slot.endTime}</span>
                      </div>
                    </td>

                    {weekDays.map((d) => {
                      const item = scheduleGrid[d.dateStr]?.[slot.period];
                      const isSelected = selectedDay === d.dateStr && selectedPeriods.includes(slot.period);

                      return (
                        <td
                          key={d.dateStr}
                          onClick={() => handleCellClick(d.dateStr, slot.period, item)}
                          className={`p-2 border-r border-white/10 last:border-r-0 align-top transition-all cursor-pointer relative min-h-[70px] ${
                            isSelected
                              ? "bg-indigo-600/30 ring-2 ring-indigo-400/80 z-10"
                              : item
                              ? "bg-slate-950/40 hover:bg-slate-950/60"
                              : "hover:bg-cyan-500/5"
                          }`}
                        >
                          {item ? (
                            <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/30 space-y-1 group relative">
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-xs text-cyan-200 line-clamp-1">
                                  {item.classes?.name || item.title}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(item.id, item.classes?.name || item.title);
                                  }}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Xóa buổi học này"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold text-[9px]">
                                  Khối {item.classes?.grade || "12"}
                                </span>
                              </div>

                              {(item.custom_meet_link || item.classes?.meet_link) && (
                                <a
                                  href={
                                    (item.custom_meet_link || item.classes?.meet_link).startsWith("http")
                                      ? item.custom_meet_link || item.classes?.meet_link
                                      : `https://${item.custom_meet_link || item.classes?.meet_link}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-semibold transition-all"
                                >
                                  <Video className="w-3 h-3" />
                                  <span>Meet</span>
                                </a>
                              )}
                            </div>
                          ) : isSelected ? (
                            <div className="h-full min-h-[50px] flex items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 font-bold text-xs animate-pulse">
                              Đã chọn
                            </div>
                          ) : (
                            <div className="h-full min-h-[50px] flex items-center justify-center rounded-xl border border-dashed border-white/5 opacity-0 hover:opacity-100 text-[10px] text-slate-500 font-medium">
                              + Đặt lịch
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Action Bar khi giáo viên chọn tiết trên bảng */}
      {selectedDay && selectedPeriods.length > 0 && (
        <div className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 max-w-xl w-full bg-slate-900 border border-indigo-500/40 rounded-3xl p-5 shadow-2xl shadow-indigo-950/80 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-6">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Đang Chọn Tiết Học
              </span>
              <h3 className="text-sm font-bold text-white">
                {selectedDayInfo?.dayName} ({selectedDayInfo?.formatted}) • {selectedPeriodRangeText}
              </h3>
            </div>
            <button
              onClick={() => {
                setSelectedDay(null);
                setSelectedPeriods([]);
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleBookSlots} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Chọn Lớp Học *
                </label>
                <select
                  value={bookingClassId}
                  onChange={(e) => setBookingClassId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900">
                      {c.name} (Khối {c.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Lặp lại tuần học
                </label>
                <select
                  value={bookingRepeatWeeks}
                  onChange={(e) => setBookingRepeatWeeks(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={1}>Chỉ đặt cho tuần này</option>
                  <option value={4}>Lặp lại trong 4 tuần tới</option>
                  <option value={8}>Lặp lại trong 8 tuần tới</option>
                  <option value={18}>Lặp lại toàn bộ 18 tuần học kỳ</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setSelectedDay(null);
                  setSelectedPeriods([]);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác Nhận Đặt Lịch ({selectedPeriods.length} tiết)</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
