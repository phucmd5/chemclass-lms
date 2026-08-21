import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function syncAllStudentPasswords() {
  const { data: usersData, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error listing users:", error);
    return;
  }

  for (const u of usersData.users) {
    if (u.user_metadata?.role === "student") {
      await supabase.auth.admin.updateUserById(u.id, {
        user_metadata: {
          ...u.user_metadata,
          must_change_password: true,
        },
      });
      console.log(`✅ Set must_change_password = true for student ${u.email}`);
    }
  }

  console.log("Sync complete!");
}

syncAllStudentPasswords();
