"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PasswordChangeResult {
  error?: string;
  success?: boolean;
}

/**
 * Đổi mật khẩu cho Học sinh khi đăng nhập lần đầu
 */
export async function changeStudentPassword(formData: FormData): Promise<PasswordChangeResult> {
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!newPassword || !confirmPassword) {
    return { error: "Vui lòng nhập đầy đủ mật khẩu mới và xác nhận mật khẩu!" };
  }

  if (newPassword.length < 6) {
    return { error: "Mật khẩu mới phải có tối thiểu 6 ký tự!" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Mật khẩu xác nhận không khớp với mật khẩu mới!" };
  }

  if (newPassword === "123456") {
    return { error: "Vui lòng không sử dụng mật khẩu mặc định (123456). Hãy đặt mật khẩu riêng của bạn!" };
  }

  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  if (userErr || !user) {
    return { error: "Bạn chưa đăng nhập hoặc phiên đã hết hạn!" };
  }

  // 1. Cập nhật mật khẩu trong Supabase Auth
  const { error: updateAuthErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateAuthErr) {
    return { error: `Lỗi cập nhật mật khẩu: ${updateAuthErr.message}` };
  }

  // 2. Cập nhật cờ must_change_password = false trong profiles
  const adminClient = createAdminClient();
  try {
    await adminClient
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);
  } catch (err) {
    console.warn("Chưa có cột must_change_password:", err);
  }

  return { success: true };
}
