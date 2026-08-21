"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIME_SLOT_DEFS } from "@/lib/constants";
import { revalidatePath } from "next/cache";

/**
 * Lấy toàn bộ lịch dạy của Giáo viên
 */
export async function getTeacherSchedules() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const adminClient = createAdminClient();

  // Lấy các lớp của giáo viên
  const { data: teacherClasses } = await adminClient
    .from("classes")
    .select("id")
    .eq("teacher_id", user.id);

  const classIds = (teacherClasses || []).map((c) => c.id);
  if (classIds.length === 0) return [];

  const { data, error } = await adminClient
    .from("schedules")
    .select(`
      *,
      classes:class_id (
        id,
        name,
        grade,
        meet_link,
        monthly_fee
      )
    `)
    .in("class_id", classIds)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Lỗi lấy lịch học:", error);
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    classes: Array.isArray(item.classes) ? item.classes[0] : item.classes,
  }));
}

/**
 * Đặt lịch học theo nhiều tiết được chọn trong một ngày (Không cần nhập tiêu đề)
 */
export async function bookMultipleTimeSlots(payload: {
  classId: string;
  dateStr: string; // YYYY-MM-DD
  startPeriod: number; // 1 -> 6
  endPeriod: number; // 1 -> 6
  customMeetLink?: string;
  note?: string;
  repeatWeeksCount?: number; // Số tuần muốn lặp lại (1 = chỉ tuần này, 4 = lặp 4 tuần)
}) {
  const { classId, dateStr, startPeriod, endPeriod, customMeetLink, note, repeatWeeksCount = 1 } = payload;

  if (!classId || !dateStr || !startPeriod || !endPeriod) {
    return { error: "Vui lòng chọn lớp học và các tiết cần lên lịch!" };
  }

  const adminClient = createAdminClient();

  // Lấy thông tin lớp học để tạo tiêu đề tự động
  const { data: cls } = await adminClient.from("classes").select("name").eq("id", classId).single();
  const className = cls?.name || "Lớp học";

  // Xác định giờ bắt đầu của startPeriod và giờ kết thúc của endPeriod
  const firstSlot = TIME_SLOT_DEFS.find((s) => s.period === Math.min(startPeriod, endPeriod));
  const lastSlot = TIME_SLOT_DEFS.find((s) => s.period === Math.max(startPeriod, endPeriod));

  if (!firstSlot || !lastSlot) {
    return { error: "Khung giờ không hợp lệ!" };
  }

  let slotLabel = "";
  if (firstSlot.period === 6 && lastSlot.period === 6) {
    slotLabel = "Buổi Chiều (13:30 - 16:30)";
  } else if (firstSlot.period === lastSlot.period) {
    slotLabel = `${firstSlot.name} (${firstSlot.startTime} - ${firstSlot.endTime})`;
  } else {
    slotLabel = `${firstSlot.name} - ${lastSlot.name} (${firstSlot.startTime} - ${lastSlot.endTime})`;
  }

  const autoTitle = `${className} • ${slotLabel}`;

  const baseDate = new Date(dateStr);
  const insertItems: any[] = [];

  for (let w = 0; w < repeatWeeksCount; w++) {
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + w * 7);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const currentDayStr = `${year}-${month}-${day}`;

    const startDateTime = new Date(`${currentDayStr}T${firstSlot.startTime}:00+07:00`).toISOString();
    const endDateTime = new Date(`${currentDayStr}T${lastSlot.endTime}:00+07:00`).toISOString();

    insertItems.push({
      class_id: classId,
      title: autoTitle,
      start_time: startDateTime,
      end_time: endDateTime,
      custom_meet_link: customMeetLink || null,
      note: note || null,
    });
  }

  const { error } = await adminClient.from("schedules").insert(insertItems);

  if (error) {
    return { error: `Lỗi đặt lịch: ${error.message}` };
  }

  revalidatePath("/dashboard/schedules");
  revalidatePath(`/dashboard/classes/${classId}`);
  return { success: true, count: insertItems.length };
}

/**
 * Tạo một buổi học lẻ (thủ công)
 */
export async function createSchedule(formData: FormData) {
  const classId = formData.get("classId") as string;
  const title = (formData.get("title") as string)?.trim();
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const customMeetLink = (formData.get("customMeetLink") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;

  if (!classId || !title || !startTime || !endTime) {
    return { error: "Vui lòng nhập đầy đủ tiêu đề buổi học, giờ bắt đầu và giờ kết thúc!" };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.from("schedules").insert({
    class_id: classId,
    title,
    start_time: new Date(startTime).toISOString(),
    end_time: new Date(endTime).toISOString(),
    custom_meet_link: customMeetLink,
    note,
  });

  if (error) {
    return { error: `Lỗi tạo lịch học: ${error.message}` };
  }

  revalidatePath("/dashboard/schedules");
  revalidatePath(`/dashboard/classes/${classId}`);
  return { success: true };
}

/**
 * Xóa một buổi học
 */
export async function deleteSchedule(scheduleId: string, classId?: string) {
  if (!scheduleId) return { error: "Thiếu ID lịch học!" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("schedules").delete().eq("id", scheduleId);

  if (error) {
    return { error: `Lỗi xóa lịch: ${error.message}` };
  }

  revalidatePath("/dashboard/schedules");
  if (classId) revalidatePath(`/dashboard/classes/${classId}`);
  return { success: true };
}

/**
 * Lấy lịch học và thông tin lớp của Học sinh đang đăng nhập
 */
export async function getStudentDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();

  // 1. Hồ sơ học sinh
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // 2. Danh sách lớp học sinh tham gia
  const { data: memberships } = await adminClient
    .from("class_members")
    .select(`
      id,
      classes:class_id (
        id,
        name,
        grade,
        description,
        meet_link,
        monthly_fee
      )
    `)
    .eq("student_id", user.id);

  const classes = (memberships || [])
    .map((m) => (Array.isArray(m.classes) ? m.classes[0] : m.classes))
    .filter(Boolean);

  const classIds = classes.map((c: any) => c.id);

  // 3. Lịch học sắp tới của các lớp này
  let upcomingSchedules: any[] = [];
  if (classIds.length > 0) {
    const { data: schedules } = await adminClient
      .from("schedules")
      .select(`
        *,
        classes:class_id (
          id,
          name,
          meet_link
        )
      `)
      .in("class_id", classIds)
      .gte("start_time", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true })
      .limit(10);

    upcomingSchedules = (schedules || []).map((s) => ({
      ...s,
      classes: Array.isArray(s.classes) ? s.classes[0] : s.classes,
    }));
  }

  return {
    profile,
    classes,
    upcomingSchedules,
  };
}
