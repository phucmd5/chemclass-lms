import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testUserMetadata() {
  const { data: usersData, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error listing users:", error);
    return;
  }
  console.log("Found", usersData.users.length, "users:");
  for (const u of usersData.users) {
    console.log(u.email, "meta:", u.user_metadata);
  }
}

testUserMetadata();
