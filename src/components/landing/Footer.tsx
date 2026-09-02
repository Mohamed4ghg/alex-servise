import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

/** Lightweight brand marks (lucide-react no longer ships logo icons). */
const SocialIcons = {
  Facebook: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.87.24-1.46 1.5-1.46H16.5V4.36C16.24 4.32 15.3 4.24 14.2 4.24c-2.3 0-3.87 1.4-3.87 3.98V10.5H7.8v3h2.53V21h3.17Z" />
    </svg>
  ),
  Instagram: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.7" />
      <circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  Youtube: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
      <path d="M10.3 9.3v5.4l4.7-2.7-4.7-2.7Z" fill="currentColor" stroke="none" />
    </svg>
  ),
};

export function Footer() {
  return (
    <footer id="about" className="border-t border-gray-100 bg-navy-50/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-6 text-gray-500">
              منصة متكاملة لإدارة الشحن والتوصيل، تربط المكتب والمندوبين والعملاء في نظام واحد.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {[SocialIcons.Facebook, SocialIcons.Instagram, SocialIcons.Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-red-200 hover:text-red-600"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-navy-950">روابط سريعة</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-gray-500">
              <li><a href="#features" className="hover:text-navy-900">المميزات</a></li>
              <li><a href="#how-it-works" className="hover:text-navy-900">كيف نعمل؟</a></li>
              <li><Link href="/tracking" className="hover:text-navy-900">تتبع شحنتك</Link></li>
              <li><Link href="/login" className="hover:text-navy-900">تسجيل الدخول</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-navy-950">قانوني</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-gray-500">
              <li><a href="#" className="hover:text-navy-900">سياسة الخصوصية</a></li>
              <li><a href="#" className="hover:text-navy-900">الشروط والأحكام</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-navy-950">تواصل معنا</h4>
            <ul className="mt-4 space-y-3 text-sm text-gray-500">
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-red-600" /> 19XXX</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-red-600" /> support@alexservice.com</li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-red-600" /> الإسكندرية، مصر</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-6 text-xs text-gray-400 sm:flex-row">
          <p>© 2026 Alex Service. جميع الحقوق محفوظة.</p>
          <p>صُنع لإدارة الشحن الحقيقي، وليس عرضًا تجريبيًا.</p>
        </div>
      </div>
    </footer>
  );
}
