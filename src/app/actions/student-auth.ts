"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PasswordChangeResult {
  error?: string;
  success?: boolean;
}

/**
 * Lấy trạng thái đổi mật khẩu của học sinh hiện tại
 */
export async function getStudentPasswordStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isFirstTime: true };

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("must_change_password, full_name, student_code")
    .eq("id", user.id)
    .single();

  return {
    isFirstTime: profile?.must_change_password ?? false,
    profile,
  };
}

/**
 * Đổi mật khẩu lần đầu cho Học sinh (Bắt buộc - Không cần mật khẩu cũ vì vừa đăng nhập bằng 123456)
 */
export async function changeStudentPasswordFirstTime(formData: FormData): Promise<PasswordChangeResult> {
  const newPassword = (formData.get("newPassword") as string)?.trim();
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim();

  if (!newPassword || !confirmPassword) {
    return { error: "Vui lòng nhập đầy đủ mật khẩu mới và xác nhận mật khẩu!" };
  }

  if (newPassword.length < 6) {
    return { error: "Mật khẩu mới phải có tối thiểu 6 ký tự!" };
  }

  if (newPassword === "123456") {
    return { error: "Mật khẩu mới không được trùng với mật khẩu mặc định (123456). Vui lòng đặt mật khẩu riêng!" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Mật khẩu xác nhận không khớp với mật khẩu mới!" };
  }

  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  if (userErr || !user) {
    return { error: "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn!" };
  }

  // 1. Cập nhật mật khẩu mới trong Supabase Auth
  const { error: updateAuthErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateAuthErr) {
    return { error: `Lỗi cập nhật mật khẩu: ${updateAuthErr.message}` };
  }

  // 2. Tắt cờ must_change_password = false
  const adminClient = createAdminClient();
  try {
    await adminClient
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);
  } catch (err) {
    console.warn("Lỗi tắt cờ must_change_password:", err);
  }

  return { success: true };
}

/**
 * Đổi mật khẩu tự nguyện khi học sinh đã đăng nhập thành công (Bắt buộc phải nhập Mật khẩu hiện tại)
 */
export async function changeStudentPasswordVoluntary(formData: FormData): Promise<PasswordChangeResult> {
  const currentPassword = (formData.get("currentPassword") as string)?.trim();
  const newPassword = (formData.get("newPassword") as string)?.trim();
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Vui lòng điền đầy đủ: Mật khẩu hiện tại, Mật khẩu mới và Xác nhận mật khẩu!" };
  }

  if (newPassword.length < 6) {
    return { error: "Mật khẩu mới phải có tối thiểu 6 ký tự!" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Mật khẩu xác nhận không khớp với mật khẩu mới!" };
  }

  if (currentPassword === newPassword) {
    return { error: "Mật khẩu mới không được trùng với mật khẩu hiện tại!" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!" };
  }

  // 1. Xác thực mật khẩu hiện tại bằng cách thử đăng nhập lại
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyErr) {
    return { error: "Mật khẩu hiện tại không chính xác! Vui lòng kiểm tra lại." };
  }

  // 2. Cập nhật sang mật khẩu mới
  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateErr) {
    return { error: `Lỗi đổi mật khẩu: ${updateErr.message}` };
  }

  // 3. Đảm bảo cờ must_change_password là false
  const adminClient = createAdminClient();
  try {
    await adminClient
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);
  } catch {}

  return { success: true };
}
