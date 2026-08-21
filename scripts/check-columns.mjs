import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkColumns() {
  const { data, error } = await supabase.from("profiles").select("id, must_change_password, contact_email").limit(1);
  if (error) {
    console.log("Column check result:", error.message);
  } else {
    console.log("Columns already exist!");
  }
}

checkColumns();
