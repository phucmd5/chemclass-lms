"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export interface AuthState {
  error?: string;
  success?: boolean;
}

/**
 * Đăng ký tài khoản Giáo viên (Tự động xác thực email + Báo lỗi nếu tài khoản đã tồn tại)
 */
export async function registerTeacher(formData: FormData): Promise<AuthState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || "";

  if (!email || !password || !fullName) {
    return { error: "Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!" };
  }

  if (password.length < 6) {
    return { error: "Mật khẩu phải có độ dài tối thiểu 6 ký tự!" };
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // 1. Kiểm tra xem Email đã được đăng ký trong hệ thống chưa
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .single();

  if (existingProfile) {
    return {
      error: "Tài khoản email này đã được sử dụng! Vui lòng đăng nhập hoặc sử dụng email khác.",
    };
  }

  // 2. Tạo tài khoản Giáo viên với email_confirm: true (cho phép đăng nhập ngay không cần đợi email)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "teacher",
    },
  });

  if (authError) {
    if (authError.message.toLowerCase().includes("already") || authError.message.toLowerCase().includes("exists")) {
      return { error: "Tài khoản email này đã được sử dụng! Vui lòng sử dụng email khác hoặc Đăng nhập." };
    }
    return { error: `Đăng ký thất bại: ${authError.message}` };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return { error: "Không thể tạo tài khoản, vui lòng thử lại." };
  }

  // 3. Lưu thông tin đầy đủ vào bảng profiles
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

  // 4. Tự động Đăng nhập luôn cho Giáo viên ngay sau khi đăng ký
  const { error: autoSignInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (autoSignInError) {
    // Nếu tự đăng nhập lỗi thì yêu cầu người dùng tự đăng nhập ở trang login
    return { success: true };
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

  let loginEmail = identifier.toLowerCase();

  // Nếu người dùng không nhập định dạng email (ví dụ nhập mã HS "HS01"), tìm email tương ứng trong profiles
  if (!identifier.includes("@")) {
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("email, role")
      .ilike("student_code", identifier)
      .single();

    if (profileErr || !profile) {
      return { error: `Không tìm thấy học sinh với mã "${identifier}"! Vui lòng kiểm tra lại.` };
    }
    loginEmail = profile.email;
  }

  // Thực hiện đăng nhập
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password,
  });

  if (signInErr) {
    if (signInErr.message.includes("Invalid login credentials")) {
      return { error: "Tài khoản hoặc mật khẩu không chính xác! Vui lòng kiểm tra lại." };
    }
    if (signInErr.message.includes("Email not confirmed")) {
      return { error: "Email tài khoản chưa được xác thực trên hệ thống." };
    }
    return { error: `Đăng nhập thất bại: ${signInErr.message}` };
  }

  // Lấy role của user để chuyển hướng đúng trang
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
  try {
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
  } catch (err) {
    console.error("Lỗi lấy profile:", err);
    return null;
  }
}
