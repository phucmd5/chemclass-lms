"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateStudentCode } from "@/lib/utils";
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
  const name = (formData.get("name") as string)?.trim();
  const grade = formData.get("grade") as string;
  const description = (formData.get("description") as string)?.trim() || "";
  const meetLink = (formData.get("meetLink") as string)?.trim() || "";
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
 * Cập nhật thông tin Lớp học (Sửa tên, khối, Google Meet, học phí, mô tả)
 */
export async function updateClass(formData: FormData) {
  const classId = formData.get("classId") as string;
  const name = (formData.get("name") as string)?.trim();
  const grade = formData.get("grade") as string;
  const description = (formData.get("description") as string)?.trim() || "";
  const meetLink = (formData.get("meetLink") as string)?.trim() || "";
  const monthlyFee = parseFloat((formData.get("monthlyFee") as string) || "0");

  if (!classId || !name || !grade) {
    return { error: "Vui lòng điền đầy đủ tên lớp và khối lớp!" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bạn chưa đăng nhập!" };
  }

  const { error } = await supabase
    .from("classes")
    .update({
      name,
      grade,
      description,
      meet_link: meetLink,
      monthly_fee: monthlyFee,
    })
    .eq("id", classId)
    .eq("teacher_id", user.id);

  if (error) {
    return { error: `Lỗi cập nhật lớp học: ${error.message}` };
  }

  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${classId}`);
  return { success: true };
}

/**
 * Xóa một Lớp học
 */
export async function deleteClass(classId: string) {
  if (!classId) return { error: "Thiếu mã lớp học!" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Bạn chưa đăng nhập!" };

  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("teacher_id", user.id);

  if (error) {
    return { error: `Lỗi xóa lớp học: ${error.message}` };
  }

  revalidatePath("/dashboard/classes");
  return { success: true };
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
    .order("joined_at", { ascending: true });

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
 * Thêm học sinh đơn lẻ vào lớp
 */
export async function addStudentToClass(formData: FormData) {
  const classId = formData.get("classId") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  let studentCode = (formData.get("studentCode") as string)?.trim().toUpperCase();
  const phone = (formData.get("phone") as string)?.trim() || "";
  const contactEmail = (formData.get("contactEmail") as string)?.trim() || "";
  const password = (formData.get("password") as string)?.trim() || "123456";

  if (!classId || !fullName) {
    return { error: "Vui lòng nhập đầy đủ Họ tên học sinh!" };
  }

  const adminClient = createAdminClient();

  // Nếu giáo viên không nhập mã HS, tự sinh theo quy tắc: [Tên Lớp] + [STT 2 số] (VD: 12A101)
  if (!studentCode) {
    const { data: cls } = await adminClient.from("classes").select("name").eq("id", classId).single();
    const { count } = await adminClient
      .from("class_members")
      .select("*", { count: "exact", head: true })
      .eq("class_id", classId);

    studentCode = generateStudentCode(cls?.name || "HS", (count || 0) + 1);
  }

  const internalEmail = `${studentCode.toLowerCase()}@chemclass.local`;

  // 1. Kiểm tra xem học sinh có mã này đã tồn tại chưa
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .eq("student_code", studentCode)
    .single();

  let studentUserId = existingProfile?.id;

  if (!studentUserId) {
    // 2. Tạo tài khoản trong Supabase Auth
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

    // 3. Lưu thông tin cơ bản vào bảng profiles
    const profilePayload: any = {
      id: studentUserId,
      email: internalEmail,
      full_name: fullName,
      role: "student",
      student_code: studentCode,
      phone: phone || null,
    };

    const { error: profErr } = await adminClient.from("profiles").upsert(profilePayload);
    if (profErr) {
      return { error: `Lỗi lưu hồ sơ học sinh: ${profErr.message}` };
    }

    // Cập nhật thêm các trường mở rộng nếu có
    try {
      await adminClient.from("profiles").update({
        contact_email: contactEmail || null,
        must_change_password: true,
      }).eq("id", studentUserId);
    } catch {
      // Bỏ qua nếu chưa chạy SQL tạo cột
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
 * Cấp lại mật khẩu mặc định (Reset password) cho Học sinh
 */
export async function resetStudentPassword(studentId: string, classId: string, defaultPassword = "123456") {
  if (!studentId) return { error: "Thiếu ID học sinh!" };

  const adminClient = createAdminClient();

  // 1. Cập nhật mật khẩu trong Supabase Auth thành mật khẩu mặc định
  const { error: authErr } = await adminClient.auth.admin.updateUserById(studentId, {
    password: defaultPassword,
  });

  if (authErr) {
    return { error: `Lỗi reset mật khẩu: ${authErr.message}` };
  }

  // 2. Bật lại cờ must_change_password = true
  try {
    await adminClient
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", studentId);
  } catch {
    // Bỏ qua nếu cột chưa tồn tại
  }

  revalidatePath(`/dashboard/classes/${classId}`);
  return { success: true, newPassword: defaultPassword };
}

/**
 * Nhập danh sách học sinh hàng loạt từ file Excel (Tự động tạo mã dạng 12A101, 12A102 nếu thiếu)
 */
export async function importStudentsFromExcel(
  classId: string,
  studentsList: Array<{
    studentCode?: string;
    fullName: string;
    phone?: string;
    contactEmail?: string;
    password?: string;
  }>
) {
  if (!classId || !studentsList || studentsList.length === 0) {
    return { error: "Danh sách học sinh trống!" };
  }

  const adminClient = createAdminClient();

  // Lấy thông tin lớp học và số học sinh hiện tại
  const { data: cls } = await adminClient.from("classes").select("name").eq("id", classId).single();
  const className = cls?.name || "12A1";

  const { count: currentStudentCount } = await adminClient
    .from("class_members")
    .select("*", { count: "exact", head: true })
    .eq("class_id", classId);

  let runningIndex = (currentStudentCount || 0) + 1;
  let successCount = 0;
  const errors: string[] = [];

  for (const st of studentsList) {
    const name = st.fullName?.trim();
    if (!name) continue;

    // Nếu trong Excel không có Mã HS hoặc trống -> Tự động sinh theo quy tắc [Tên lớp] + [Số thứ tự 2 số] (VD: 12A101, 12A102)
    let code = st.studentCode?.trim().toUpperCase();
    if (!code) {
      code = generateStudentCode(className, runningIndex);
      runningIndex++;
    }

    const phone = st.phone?.trim() || "";
    const contactEmail = st.contactEmail?.trim() || "";
    const password = st.password?.trim() || "123456";
    const internalEmail = `${code.toLowerCase()}@chemclass.local`;

    try {
      // 1. Kiểm tra học sinh đã tồn tại chưa
      const { data: existing } = await adminClient
        .from("profiles")
        .select("id")
        .eq("student_code", code)
        .single();

      let studentUserId = existing?.id;

      if (!studentUserId) {
        // 2. Tạo Auth user
        const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
          email: internalEmail,
          password: password,
          email_confirm: true,
          user_metadata: { full_name: name, role: "student", student_code: code },
        });

        if (authErr) {
          errors.push(`Lỗi tạo tài khoản cho ${code} (${name}): ${authErr.message}`);
          continue;
        }

        studentUserId = authUser.user.id;

        // 3. Lưu profile cơ bản
        const { error: profErr } = await adminClient.from("profiles").upsert({
          id: studentUserId,
          email: internalEmail,
          full_name: name,
          role: "student",
          student_code: code,
          phone: phone || null,
        });

        if (profErr) {
          errors.push(`Lỗi lưu hồ sơ cho ${code}: ${profErr.message}`);
          continue;
        }

        // Cập nhật trường mở rộng
        try {
          await adminClient.from("profiles").update({
            contact_email: contactEmail || null,
            must_change_password: true,
          }).eq("id", studentUserId);
        } catch {
          // Bỏ qua nếu cột chưa tồn tại
        }
      }

      // 4. Gắn vào lớp
      const { error: memberErr } = await adminClient.from("class_members").upsert(
        { class_id: classId, student_id: studentUserId, status: "active" },
        { onConflict: "class_id,student_id" }
      );

      if (memberErr) {
        errors.push(`Lỗi gán ${code} vào lớp: ${memberErr.message}`);
        continue;
      }

      successCount++;
    } catch (err: any) {
      errors.push(`Lỗi xử lý học sinh ${code}: ${err.message}`);
    }
  }

  revalidatePath(`/dashboard/classes/${classId}`);

  if (successCount === 0 && errors.length > 0) {
    return { error: errors.join(" | ") };
  }

  return { success: true, count: successCount, errors };
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
