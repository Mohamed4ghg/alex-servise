import { CustomerNav } from "@/components/customer/CustomerNav";
import { CustomerSidebar } from "@/components/customer/CustomerSidebar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#f7f7f8]" dir="rtl">
      <CustomerSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <CustomerNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}