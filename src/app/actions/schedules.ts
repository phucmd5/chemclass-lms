"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Tạo buổi học / thời khóa biểu mới
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

  const supabase = await createClient();

  const { error } = await supabase.from("schedules").insert({
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
 * Lấy toàn bộ lịch dạy của Giáo viên
 */
export async function getTeacherSchedules() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("schedules")
    .select(`
      *,
      classes:class_id (
        id,
        name,
        grade,
        meet_link
      )
    `)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Lỗi lấy lịch học:", error);
    return [];
  }

  return data || [];
}

/**
 * Xóa một buổi học
 */
export async function deleteSchedule(scheduleId: string, classId?: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("schedules").delete().eq("id", scheduleId);

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
      .gte("start_time", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Từ 2 tiếng trước trở đi
      .order("start_time", { ascending: true })
      .limit(10);

    upcomingSchedules = schedules || [];
  }

  return {
    profile,
    classes,
    upcomingSchedules,
  };
}
