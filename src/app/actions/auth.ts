"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export interface AuthState {
  error?: string;
  success?: boolean;
  role?: string;
  redirectUrl?: string;
}

/**
 * Đăng ký tài khoản Giáo viên (Tự động kích hoạt + Đăng nhập ngay)
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

  // 1. Kiểm tra xem Email đã tồn tại trong Auth hoặc Profiles chưa
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

  // 2. Tạo tài khoản Giáo viên với email_confirm: true
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
    if (
      authError.message.toLowerCase().includes("already") ||
      authError.message.toLowerCase().includes("exists")
    ) {
      return {
        error: "Tài khoản email này đã tồn tại trên hệ thống! Vui lòng đăng nhập.",
      };
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
    return { error: `Lỗi lưu hồ sơ giáo viên: ${profileError.message}` };
  }

  // 4. Đăng nhập để lưu cookie session
  await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    success: true,
    role: "teacher",
    redirectUrl: "/dashboard",
  };
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

  // Nếu người dùng không nhập định dạng email (ví dụ nhập mã HS "12A101"), tìm email tương ứng trong profiles
  if (!identifier.includes("@")) {
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("email, role")
      .ilike("student_code", identifier)
      .single();

    if (profileErr || !profile) {
      return { error: `Không tìm thấy học sinh với tài khoản "${identifier}"! Vui lòng kiểm tra lại.` };
    }
    loginEmail = profile.email;
  }

  // Thử đăng nhập lần 1
  let { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password,
  });

  // Nếu bị lỗi do tài khoản cũ chưa kích hoạt email, tự động kích hoạt giúp người dùng
  if (signInErr && signInErr.message.toLowerCase().includes("email not confirmed")) {
    const { data: userList } = await adminClient.auth.admin.listUsers();
    const targetUser = userList?.users?.find((u) => u.email?.toLowerCase() === loginEmail);
    if (targetUser) {
      await adminClient.auth.admin.updateUserById(targetUser.id, {
        email_confirm: true,
      });
      // Thử đăng nhập lại sau khi kích hoạt
      const retryResult = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      signInData = retryResult.data;
      signInErr = retryResult.error;
    }
  }

  if (signInErr || !signInData?.user) {
    if (signInErr?.message.includes("Invalid login credentials")) {
      return { error: "Mật khẩu hoặc thông tin đăng nhập không chính xác! Vui lòng kiểm tra lại." };
    }
    return { error: `Đăng nhập không thành công: ${signInErr?.message || "Lỗi không xác định"}` };
  }

  // Lấy role & cờ đổi mật khẩu của user để xác định trang điều hướng
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", signInData.user.id)
    .single();

  const role = profile?.role || "teacher";
  let redirectUrl = "/dashboard";

  if (role === "student") {
    // Nếu học sinh đăng nhập lần đầu (chưa đổi mật khẩu) -> LẬP TỨC chuyển đến màn hình đổi mật khẩu
    if (profile?.must_change_password !== false) {
      redirectUrl = "/student/change-password";
    } else {
      redirectUrl = "/student";
    }
  }

  return {
    success: true,
    role,
    redirectUrl,
  };
}

/**
 * Đăng xuất
 */
export async function logoutUser(): Promise<void> {
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
