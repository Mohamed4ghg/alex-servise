import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import NewStaffForm from "./NewStaffForm";
import { UserRound } from "lucide-react";

export default async function StaffPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // الصفحة دي للأدمن بس، حتى لو الموظف عنده صلاحية يفتح /dashboard عموماً
  if (myProfile?.role !== "admin") {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500 shadow-[var(--shadow-card)]">
        الصفحة دي متاحة للأدمن بس.
      </div>
    );
  }

  const { data: staffList } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("role", "staff")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
          <UserRound className="h-5 w-5 text-white" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-navy-950">إدارة الموظفين</h1>
          <p className="text-sm text-gray-500">{staffList?.length ?? 0} موظف مسجّل</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)]">
            {!staffList || staffList.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400">لا يوجد موظفين مسجّلين بعد</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {staffList.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-900">
                      {(s.full_name ?? "م ظ").trim().slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-950">
                        {s.full_name ?? "بدون اسم"}
                      </p>
                      <p className="truncate text-xs text-gray-400" dir="ltr">
                        {s.email}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <NewStaffForm />
      </div>
    </div>
  );
}