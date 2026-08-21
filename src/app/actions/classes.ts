"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Lấy danh sách lớp học của Giáo viên kèm số lượng học sinh
 */
export async function getTeacherClasses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: classes, error } = await supabase
    .from("classes")
    .select(`
      *,
      class_members (
        id,
        student_id
      )
    `)
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Lỗi lấy danh sách lớp:", error);
    return [];
  }

  return (classes || []).map((cls) => ({
    ...cls,
    studentCount: cls.class_members?.length || 0,
  }));
}

/**
 * Tạo lớp học mới
 */
export async function createClass(formData: FormData) {
  const name = formData.get("name") as string;
  const grade = formData.get("grade") as string;
  const description = (formData.get("description") as string) || "";
  const meetLink = (formData.get("meetLink") as string) || "";
  const monthlyFee = parseFloat((formData.get("monthlyFee") as string) || "0");

  if (!name || !grade) {
    return { error: "Vui lòng nhập tên lớp và chọn khối lớp!" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bạn chưa đăng nhập!" };
  }

  const { data, error } = await supabase
    .from("classes")
    .insert({
      teacher_id: user.id,
      name,
      grade,
      description,
      meet_link: meetLink,
      monthly_fee: monthlyFee,
    })
    .select()
    .single();

  if (error) {
    return { error: `Lỗi tạo lớp: ${error.message}` };
  }

  revalidatePath("/dashboard/classes");
  return { success: true, classId: data.id };
}

/**
 * Lấy chi tiết một lớp học (Thông tin lớp, Danh sách học sinh, Thời khóa biểu)
 */
export async function getClassDetails(classId: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: cls, error: clsErr } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .single();

  if (clsErr || !cls) return null;

  // Lấy danh sách thành viên trong lớp kèm hồ sơ học sinh
  const { data: members } = await adminClient
    .from("class_members")
    .select(`
      id,
      status,
      joined_at,
      profiles:student_id (
        id,
        full_name,
        email,
        student_code,
        phone
      )
    `)
    .eq("class_id", classId)
    .order("joined_at", { ascending: false });

  // Lấy lịch học của lớp
  const { data: schedules } = await supabase
    .from("schedules")
    .select("*")
    .eq("class_id", classId)
    .order("start_time", { ascending: true });

  return {
    ...cls,
    students: (members || []).map((m) => ({
      membershipId: m.id,
      status: m.status,
      joinedAt: m.joined_at,
      profile: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
    })),
    schedules: schedules || [],
  };
}

/**
 * Thêm học sinh mới vào lớp (Tự động cấp tài khoản theo Phương án A)
 */
export async function addStudentToClass(formData: FormData) {
  const classId = formData.get("classId") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const studentCode = (formData.get("studentCode") as string)?.trim().toUpperCase();
  const phone = (formData.get("phone") as string)?.trim() || "";
  const password = (formData.get("password") as string)?.trim() || "123456";

  if (!classId || !fullName || !studentCode) {
    return { error: "Vui lòng nhập đầy đủ Họ tên và Mã học sinh (VD: HS01)!" };
  }

  const adminClient = createAdminClient();

  // Email nội bộ tự động để Supabase Auth quản lý
  const internalEmail = `${studentCode.toLowerCase()}@chemclass.local`;

  // 1. Kiểm tra xem học sinh có mã này đã tồn tại chưa
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .eq("student_code", studentCode)
    .single();

  let studentUserId = existingProfile?.id;

  if (!studentUserId) {
    // 2. Nếu chưa có, tạo tài khoản trong Supabase Auth
    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: internalEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "student",
        student_code: studentCode,
      },
    });

    if (authErr) {
      return { error: `Không thể tạo tài khoản học sinh: ${authErr.message}` };
    }

    studentUserId = authUser.user.id;

    // 3. Lưu thông tin vào bảng profiles
    const { error: profErr } = await adminClient.from("profiles").upsert({
      id: studentUserId,
      email: internalEmail,
      full_name: fullName,
      role: "student",
      student_code: studentCode,
      phone: phone || null,
    });

    if (profErr) {
      return { error: `Lỗi lưu hồ sơ học sinh: ${profErr.message}` };
    }
  }

  // 4. Gắn học sinh vào lớp học
  const { error: memberErr } = await adminClient.from("class_members").upsert(
    {
      class_id: classId,
      student_id: studentUserId,
      status: "active",
    },
    { onConflict: "class_id,student_id" }
  );

  if (memberErr) {
    return { error: `Lỗi gán học sinh vào lớp: ${memberErr.message}` };
  }

  revalidatePath(`/dashboard/classes/${classId}`);
  return { success: true };
}

/**
 * Xoá học sinh khỏi lớp
 */
export async function removeStudentFromClass(membershipId: string, classId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("class_members").delete().eq("id", membershipId);

  if (error) {
    return { error: `Lỗi xoá học sinh: ${error.message}` };
  }

  revalidatePath(`/dashboard/classes/${classId}`);
  return { success: true };
}
