import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTeacher() {
  const { data: classes } = await supabase.from("classes").select("*");
  console.log("Classes:", classes);

  const { data: users } = await supabase.auth.admin.listUsers();
  console.log("Users:", users.users.map(u => ({ id: u.id, email: u.email, role: u.user_metadata?.role })));
}

checkTeacher();
