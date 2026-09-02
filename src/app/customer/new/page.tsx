// src/app/customer/new/page.tsx
import { NewShipmentForm } from "@/components/customer/NewShipmentForm";

export default function NewShipmentPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold text-navy-950">
          شحنة جديدة
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          املا بيانات المستلم وتفاصيل الشحنة، وهيتم تأكيد السعر بعد المراجعة
        </p>
      </div>
      <NewShipmentForm />
    </div>
  );
}