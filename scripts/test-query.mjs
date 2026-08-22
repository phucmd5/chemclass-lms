import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testQueryWithContactEmail() {
  const { data, error } = await supabase
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
    `);

  console.log("Query with contact_email result:");
  console.log("Error:", error);
  console.log("Data length:", data?.length);

  const { data: dataNoContact, error: errorNoContact } = await supabase
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
        phone
      )
    `);

  console.log("\nQuery WITHOUT contact_email result:");
  console.log("Error:", errorNoContact);
  console.log("Data length:", dataNoContact?.length);
}

testQueryWithContactEmail();
