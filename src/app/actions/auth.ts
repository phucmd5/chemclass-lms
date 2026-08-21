"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export interface AuthState {
  error?: string;
  success?: boolean;
}

/**
 * Đăng ký tài khoản Giáo viên (Primary Teacher Account)
 */
export async function registerTeacher(formData: FormData): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const phone = formData.get("phone") as string;

  if (!email || !password || !fullName) {
    return { error: "Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!" };
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // 1. Đăng ký qua Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "teacher",
      },
    },
  });

  if (authError) {
    return { error: `Đăng ký thất bại: ${authError.message}` };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return { error: "Không thể tạo tài khoản, vui lòng thử lại." };
  }

  // 2. Chèn vào bảng profiles với role là 'teacher'
  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    email,
    full_name: fullName,
    role: "teacher",
    phone: phone || null,
  });

  if (profileError) {
    return { error: `Lỗi tạo hồ sơ giáo viên: ${profileError.message}` };
  }

  return { success: true };
}

/**
 * Đăng nhập chung cho cả Giáo viên (bằng Email) và Học sinh (bằng Mã HS hoặc Email)
 */
export async function loginUser(formData: FormData): Promise<AuthState> {
  const identifier = (formData.get("identifier") as string)?.trim();
  const password = formData.get("password") as string;

  if (!identifier || !password) {
    return { error: "Vui lòng nhập tài khoản và mật khẩu!" };
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  let loginEmail = identifier;

  // Nếu người dùng không nhập định dạng email (ví dụ nhập mã HS "HS001"), tìm email tương ứng trong profiles
  if (!identifier.includes("@")) {
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("email, role")
      .ilike("student_code", identifier)
      .single();

    if (profileErr || !profile) {
      return { error: `Không tìm thấy học sinh với mã "${identifier}"!` };
    }
    loginEmail = profile.email;
  }

  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password,
  });

  if (signInErr) {
    return { error: "Mật khẩu hoặc thông tin đăng nhập không chính xác!" };
  }

  // Lấy role của user để điều hướng đúng trang
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", signInData.user.id)
    .single();

  const role = profile?.role || "teacher";

  if (role === "student") {
    redirect("/student");
  } else {
    redirect("/dashboard");
  }
}

/**
 * Đăng xuất
 */
export async function logoutUser() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Lấy thông tin người dùng hiện tại đang đăng nhập
 */
export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}
