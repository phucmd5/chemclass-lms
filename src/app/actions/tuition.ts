"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTransferContent } from "@/lib/vietqr";
import { revalidatePath } from "next/cache";

/**
 * Lấy dữ liệu và thống kê Học phí của Giáo viên
 */
export async function getTeacherTuitionData(filterMonth?: string, filterClassId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      stats: { totalExpected: 0, totalPaid: 0, totalPending: 0, paidCount: 0, pendingCount: 0 },
      invoices: [],
      classes: [],
      availableMonths: [],
    };
  }

  const adminClient = createAdminClient();

  // 1. Lấy danh sách các lớp của giáo viên
  const { data: classes } = await adminClient
    .from("classes")
    .select("id, name, grade, monthly_fee")
    .eq("teacher_id", user.id)
    .order("name", { ascending: true });

  const teacherClasses = classes || [];
  const classIds = teacherClasses.map((c) => c.id);

  if (classIds.length === 0) {
    return {
      stats: { totalExpected: 0, totalPaid: 0, totalPending: 0, paidCount: 0, pendingCount: 0 },
      invoices: [],
      classes: [],
      availableMonths: [],
    };
  }

  // 2. Truy vấn hóa đơn học phí
  let query = adminClient
    .from("tuition_invoices")
    .select(`
      id,
      invoice_code,
      student_id,
      class_id,
      billing_month,
      amount,
      status,
      paid_at,
      note,
      created_at,
      classes:class_id (
        id,
        name,
        grade
      ),
      profiles:student_id (
        id,
        full_name,
        student_code,
        phone,
        contact_email
      )
    `)
    .in("class_id", classIds)
    .order("created_at", { ascending: false });

  if (filterClassId && filterClassId !== "all") {
    query = query.eq("class_id", filterClassId);
  }

  if (filterMonth && filterMonth !== "all") {
    query = query.eq("billing_month", filterMonth);
  }

  const { data: invoicesRaw, error } = await query;

  if (error) {
    console.error("Lỗi lấy danh sách hóa đơn học phí:", error);
    return {
      stats: { totalExpected: 0, totalPaid: 0, totalPending: 0, paidCount: 0, pendingCount: 0 },
      invoices: [],
      classes: teacherClasses,
      availableMonths: [],
    };
  }

  const invoices = (invoicesRaw || []).map((inv: any) => ({
    ...inv,
    classes: Array.isArray(inv.classes) ? inv.classes[0] : inv.classes,
    profiles: Array.isArray(inv.profiles) ? inv.profiles[0] : inv.profiles,
  }));

  // 3. Tính toán thống kê
  let totalExpected = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let paidCount = 0;
  let pendingCount = 0;
  const monthSet = new Set<string>();

  for (const inv of invoices) {
    const amt = Number(inv.amount) || 0;
    totalExpected += amt;
    if (inv.status === "paid") {
      totalPaid += amt;
      paidCount++;
    } else {
      totalPending += amt;
      pendingCount++;
    }
    if (inv.billing_month) {
      monthSet.add(inv.billing_month);
    }
  }

  return {
    stats: {
      totalExpected,
      totalPaid,
      totalPending,
      paidCount,
      pendingCount,
    },
    invoices,
    classes: teacherClasses,
    availableMonths: Array.from(monthSet).sort().reverse(),
  };
}

/**
 * Tự động tạo Hóa đơn học phí theo tháng cho toàn bộ học sinh trong lớp (hoặc tất cả các lớp)
 */
export async function generateMonthlyInvoices(payload: {
  classId: string; // ID lớp cụ thể hoặc "all"
  billingMonth: string; // VD: "09/2026"
  customAmount?: number;
  note?: string;
}) {
  const { classId, billingMonth, customAmount, note } = payload;

  if (!billingMonth) {
    return { error: "Vui lòng chọn tháng tính học phí (VD: 09/2026)!" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn chưa đăng nhập!" };

  const adminClient = createAdminClient();

  // 1. Lấy danh sách lớp áp dụng
  let classList: any[] = [];
  if (classId === "all") {
    const { data } = await adminClient
      .from("classes")
      .select("id, name, monthly_fee")
      .eq("teacher_id", user.id);
    classList = data || [];
  } else {
    const { data } = await adminClient
      .from("classes")
      .select("id, name, monthly_fee")
      .eq("id", classId)
      .eq("teacher_id", user.id)
      .single();
    if (data) classList = [data];
  }

  if (classList.length === 0) {
    return { error: "Không tìm thấy lớp học hợp lệ!" };
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const cls of classList) {
    const feeAmount = customAmount && customAmount > 0 ? customAmount : Number(cls.monthly_fee) || 0;

    // Lấy toàn bộ học sinh trong lớp này
    const { data: members } = await adminClient
      .from("class_members")
      .select(`
        student_id,
        profiles:student_id (
          id,
          student_code,
          full_name
        )
      `)
      .eq("class_id", cls.id)
      .eq("status", "active");

    for (const m of members || []) {
      const student = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      if (!student) continue;

      const studentCode = student.student_code || "HS";
      const invoiceCode = generateTransferContent(studentCode, billingMonth);

      // Kiểm tra hóa đơn của học sinh này trong tháng này đã tồn tại chưa
      const { data: existing } = await adminClient
        .from("tuition_invoices")
        .select("id")
        .eq("student_id", student.id)
        .eq("class_id", cls.id)
        .eq("billing_month", billingMonth)
        .single();

      if (existing) {
        skippedCount++;
        continue;
      }

      // Tạo hóa đơn mới
      const { error: insErr } = await adminClient.from("tuition_invoices").insert({
        invoice_code: invoiceCode,
        student_id: student.id,
        class_id: cls.id,
        billing_month: billingMonth,
        amount: feeAmount,
        status: "pending",
        note: note || `Học phí ${cls.name} tháng ${billingMonth}`,
      });

      if (!insErr) {
        createdCount++;
      }
    }
  }

  revalidatePath("/dashboard/tuition");
  return {
    success: true,
    createdCount,
    skippedCount,
  };
}

/**
 * Tạo một hóa đơn lẻ thủ công
 */
export async function createSingleInvoice(formData: FormData) {
  const studentId = formData.get("studentId") as string;
  const classId = formData.get("classId") as string;
  const billingMonth = (formData.get("billingMonth") as string)?.trim();
  const amount = parseFloat((formData.get("amount") as string) || "0");
  const note = (formData.get("note") as string)?.trim() || "";

  if (!studentId || !classId || !billingMonth || amount <= 0) {
    return { error: "Vui lòng điền đầy đủ học sinh, lớp, tháng và số tiền hợp lệ!" };
  }

  const adminClient = createAdminClient();

  const { data: student } = await adminClient
    .from("profiles")
    .select("student_code")
    .eq("id", studentId)
    .single();

  const studentCode = student?.student_code || "HS";
  const invoiceCode = generateTransferContent(studentCode, billingMonth);

  const { error } = await adminClient.from("tuition_invoices").insert({
    invoice_code: invoiceCode,
    student_id: studentId,
    class_id: classId,
    billing_month: billingMonth,
    amount,
    status: "pending",
    note: note || `Học phí tháng ${billingMonth}`,
  });

  if (error) {
    return { error: `Lỗi tạo hóa đơn: ${error.message}` };
  }

  revalidatePath("/dashboard/tuition");
  return { success: true };
}

/**
 * Đánh dấu trạng thái Hóa đơn (Đã thanh toán / Chưa thanh toán)
 */
export async function toggleInvoiceStatus(invoiceId: string, newStatus: "paid" | "pending") {
  if (!invoiceId) return { error: "Thiếu ID hóa đơn!" };

  const adminClient = createAdminClient();

  const updateData: any = {
    status: newStatus,
    paid_at: newStatus === "paid" ? new Date().toISOString() : null,
  };

  const { error } = await adminClient
    .from("tuition_invoices")
    .update(updateData)
    .eq("id", invoiceId);

  if (error) {
    return { error: `Lỗi cập nhật trạng thái: ${error.message}` };
  }

  revalidatePath("/dashboard/tuition");
  revalidatePath("/student/tuition");
  return { success: true };
}

/**
 * Xóa một Hóa đơn học phí
 */
export async function deleteInvoice(invoiceId: string) {
  if (!invoiceId) return { error: "Thiếu ID hóa đơn!" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("tuition_invoices").delete().eq("id", invoiceId);

  if (error) {
    return { error: `Lỗi xóa hóa đơn: ${error.message}` };
  }

  revalidatePath("/dashboard/tuition");
  return { success: true };
}

/**
 * Lấy danh sách Hóa đơn học phí của Học sinh đang đăng nhập
 */
export async function getStudentInvoices() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { profile: null, invoices: [] };

  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: invoices, error } = await adminClient
    .from("tuition_invoices")
    .select(`
      id,
      invoice_code,
      billing_month,
      amount,
      status,
      paid_at,
      note,
      created_at,
      classes:class_id (
        id,
        name,
        grade
      )
    `)
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Lỗi lấy hóa đơn học sinh:", error);
    return { profile, invoices: [] };
  }

  return {
    profile,
    invoices: (invoices || []).map((inv: any) => ({
      ...inv,
      classes: Array.isArray(inv.classes) ? inv.classes[0] : inv.classes,
    })),
  };
}
