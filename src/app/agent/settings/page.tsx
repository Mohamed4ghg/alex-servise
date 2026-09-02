import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AgentSettingsForm } from "@/components/agent/AgentSettingsForm";

export default async function AgentSettingsPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, phone, address, email, vehicle_type, region, notify_email, notify_sms"
    )
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold text-navy-950">
          الإعدادات
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          إدارة بياناتك الشخصية وتفضيلات الإشعارات
        </p>
      </div>

      <AgentSettingsForm
        initialData={{
          full_name: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          address: profile?.address ?? "",
          email: profile?.email ?? user.email ?? "",
          vehicle_type: profile?.vehicle_type ?? "",
          region: profile?.region ?? "",
          notify_email: profile?.notify_email ?? true,
          notify_sms: profile?.notify_sms ?? false,
        }}
      />
    </div>
  );
}