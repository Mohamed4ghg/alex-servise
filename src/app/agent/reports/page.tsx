import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReportsView } from "@/components/agent/ReportsView";

export default async function AgentReportsPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold text-navy-950">
          التقارير
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          أداؤك في الشحنات خلال الفترة اللي تختارها
        </p>
      </div>

      <ReportsView />
    </div>
  );
}