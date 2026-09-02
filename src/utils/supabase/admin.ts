import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ⚠️ سيرفر فقط. استورد الملف ده في Server Actions أو Route Handlers فقط.
// متستورده أبداً في أي "use client" component — الـ service role key
// بيدي صلاحيات أدمن كاملة تتخطى الـ RLS، ولو وصل للمتصفح أي حد يقدر
// يشوف ويعدّل كل حاجة في قاعدة البيانات.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin env vars: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}