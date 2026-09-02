import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";
import { PackagePlus } from "lucide-react";

export async function CustomerNav() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "زائر";
  const initial = userName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* اللوجو ده بيبان بس على الموبايل/التابلت، لأن السايد بار (وفيه لوجو تاني) بيظهر بدل منه على الشاشات الكبيرة */}
        <Link href="/customer" className="flex shrink-0 items-center gap-3 lg:hidden">
          <Image
            src="/images/logo.png"
            alt="Alex Service"
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl object-contain ring-1 ring-gray-100 bg-white p-1"
            priority
          />
          <div className="hidden flex-col sm:flex">
            <span className="font-display text-lg font-extrabold leading-none tracking-tight text-navy-950">
              Alex Service
            </span>
            <span className="text-[10px] font-medium tracking-widest text-gray-400">
              EXPRESS
            </span>
          </div>
        </Link>

        <Link
          href="/customer/new"
          className="hidden items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(220,38,38,0.6)] transition hover:bg-red-700 active:scale-[0.97] sm:flex lg:px-6 lg:py-3"
        >
          <PackagePlus className="h-4.5 w-4.5" />
          شحنة جديدة
        </Link>

        {/* أيقونة المستخدم — دلوقتي على أقصى الشمال، ولما تدوس عليها بتفتح قايمة فيها الإعدادات وتسجيل الخروج */}
        <UserMenu userName={userName} initial={initial} />
      </div>

      {/* Mobile Nav — لسه شغالة زي ما هي، مبتتأثرش بالسايد بار خالص */}
      <NavLinks variant="mobile" />
    </header>
  );
}

export default CustomerNav;