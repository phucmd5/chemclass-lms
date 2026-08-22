import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkInvoices() {
  console.log("=== CHECKING DATABASE INVOICES ===");
  const { data: allInvoices, error: invErr } = await supabase.from("tuition_invoices").select("*");
  console.log("All invoices in table:", allInvoices?.length, invErr || "");
  if (allInvoices && allInvoices.length > 0) {
    console.log("Sample invoice:", allInvoices[0]);
  }

  const { data: allClasses, error: clsErr } = await supabase.from("classes").select("*");
  console.log("All classes:", allClasses?.length, clsErr || "");

  const { data: allMembers, error: memErr } = await supabase.from("class_members").select("*");
  console.log("All class members:", allMembers?.length, memErr || "");

  const { data: joinQuery, error: joinErr } = await supabase
    .from("tuition_invoices")
    .select(`
      id,
      invoice_code,
      student_id,
      class_id,
      billing_month,
      amount,
      status,
      classes:class_id (
        id,
        name,
        grade
      ),
      profiles:student_id (
        id,
        full_name,
        student_code
      )
    `);
  console.log("Join query count:", joinQuery?.length, "Error:", joinErr?.message || "none");
}

checkInvoices();
