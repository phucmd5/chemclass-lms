import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Thiếu biến môi trường NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function resetDatabase() {
  console.log("🧹 Bắt đầu dọn sạch dữ liệu trong database...");

  // 1. Xóa các bảng dữ liệu nghiệp vụ
  const tables = [
    "exam_submissions",
    "questions",
    "exams",
    "tuition_invoices",
    "schedules",
    "class_members",
    "classes",
    "profiles",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.warn(`⚠️ Xóa bảng ${table}: ${error.message}`);
    } else {
      console.log(`✅ Đã xóa toàn bộ dữ liệu bảng: ${table}`);
    }
  }

  // 2. Xóa toàn bộ tài khoản trong Supabase Auth
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("❌ Lỗi liệt kê user auth:", listErr);
  } else if (usersData && usersData.users.length > 0) {
    console.log(`🗑️ Đang xóa ${usersData.users.length} tài khoản trong Supabase Auth...`);
    for (const u of usersData.users) {
      await supabase.auth.admin.deleteUser(u.id);
    }
    console.log("✅ Đã xóa toàn bộ tài khoản Auth!");
  } else {
    console.log("ℹ️ Không có tài khoản Auth nào tồn tại.");
  }

  console.log("\n🎉 HOÀN TẤT! Toàn bộ Database & Tài khoản Auth đã được làm sạch 100%.");
}

resetDatabase().catch(console.error);
