// src/app/test-rls/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function TestRLS() {
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function testAccess() {
      const supabase = createClient();

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("company_settings")
        .select("*");

      setResult({
        loggedInAs: userData?.user?.email ?? "مفيش يوزر مسجل دخول",
        data,
        error: error?.message ?? null,
      });
    }
    testAccess();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h2>RLS Test</h2>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}