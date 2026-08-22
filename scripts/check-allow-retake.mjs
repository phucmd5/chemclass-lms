import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAndAddAllowRetake() {
  console.log("Checking exams table structure...");
  const { data: sample, error } = await supabase.from("exams").select("*").limit(1);
  console.log("Sample row:", sample?.[0], error || "none");

  // Thử update thử nghiệm cột allow_retake
  if (sample && sample.length > 0) {
    const testId = sample[0].id;
    const { error: updErr } = await supabase.from("exams").update({ allow_retake: true }).eq("id", testId);
    if (updErr) {
      console.log("Column allow_retake might not exist yet:", updErr.message);
    } else {
      console.log("✅ Column allow_retake exists and works!");
    }
  }
}

checkAndAddAllowRetake();
